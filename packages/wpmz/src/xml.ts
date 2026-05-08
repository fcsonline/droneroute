import type {
  Coordinate,
  PrimitiveXmlValue,
  XmlElement,
  XmlNode,
  XmlTextNode,
} from "./types.js";

export class XmlParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "XmlParseError";
  }
}

export function isXmlElement(node: XmlNode | undefined): node is XmlElement {
  return node?.kind === "element";
}

export function isXmlTextNode(node: XmlNode | undefined): node is XmlTextNode {
  return node?.kind === "text";
}

export function localName(name: string): string {
  const i = name.indexOf(":");
  return i === -1 ? name : name.slice(i + 1);
}

export function parseXml(xml: string): XmlElement {
  const syntheticRoot: XmlElement = {
    kind: "element",
    name: "__root__",
    attributes: {},
    children: [],
  };
  const mutableRoot = mutableElement(syntheticRoot);
  const stack: MutableXmlElement[] = [mutableRoot];
  const tokenRe = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/gu;

  for (const match of xml.matchAll(tokenRe)) {
    const token = match[0];
    const parent = stack.at(-1);
    if (!parent) throw new XmlParseError("XML parser stack underflow");

    if (token.startsWith("<!--")) continue;
    if (token.startsWith("<?")) continue;
    if (token.startsWith("<![CDATA[")) {
      parent.children.push({ kind: "text", text: token.slice(9, -3) });
      continue;
    }
    if (token.startsWith("<!")) continue;

    if (token.startsWith("</")) {
      const closeName = token.slice(2, -1).trim();
      const open = stack.pop();
      if (!open || open.name !== closeName) {
        throw new XmlParseError(
          `Mismatched close tag: expected </${open?.name ?? "?"}> but found </${closeName}>`,
        );
      }
      continue;
    }

    if (token.startsWith("<")) {
      const isSelfClosing = token.endsWith("/>");
      const content = token.slice(1, isSelfClosing ? -2 : -1).trim();
      const parsed = parseStartTag(content);
      const element = mutableElement({
        kind: "element",
        name: parsed.name,
        attributes: parsed.attributes,
        children: [],
      });
      parent.children.push(element);
      if (!isSelfClosing) stack.push(element);
      continue;
    }

    if (token.length > 0)
      parent.children.push({ kind: "text", text: decodeXml(token) });
  }

  if (stack.length !== 1) {
    const openNames = stack
      .slice(1)
      .map((e) => e.name)
      .join(", ");
    throw new XmlParseError(`Unclosed XML tag(s): ${openNames}`);
  }

  const elementChildren = mutableRoot.children.filter(isXmlElement);
  const first = elementChildren[0];
  if (!first) throw new XmlParseError("XML document has no root element");
  return freezeElement(first);
}

interface MutableXmlElement extends Omit<
  XmlElement,
  "attributes" | "children"
> {
  attributes: Record<string, string>;
  children: XmlNode[];
}

function mutableElement(element: XmlElement): MutableXmlElement {
  return {
    kind: "element",
    name: element.name,
    attributes: { ...element.attributes },
    children: [...element.children],
  };
}

function freezeElement(element: XmlElement): XmlElement {
  return {
    kind: "element",
    name: element.name,
    attributes: { ...element.attributes },
    children: element.children.map((child) =>
      isXmlElement(child) ? freezeElement(child) : child,
    ),
  };
}

function parseStartTag(content: string): {
  readonly name: string;
  readonly attributes: Record<string, string>;
} {
  const nameMatch = content.match(/^([^\s/>]+)/u);
  if (!nameMatch?.[1])
    throw new XmlParseError(`Invalid start tag: <${content}>`);
  const name = nameMatch[1];
  const attrText = content.slice(name.length);
  const attributes: Record<string, string> = {};
  const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/gu;
  for (const m of attrText.matchAll(attrRe)) {
    const key = m[1];
    if (!key) continue;
    attributes[key] = decodeXml(m[3] ?? m[4] ?? "");
  }
  return { name, attributes };
}

export function elementChildren(element: XmlElement): readonly XmlElement[] {
  return element.children.filter(isXmlElement);
}

export function childrenByLocalName(
  element: XmlElement,
  wantedLocalName: string,
): readonly XmlElement[] {
  return elementChildren(element).filter(
    (child) => localName(child.name) === wantedLocalName,
  );
}

export function firstChildByLocalName(
  element: XmlElement | undefined,
  wantedLocalName: string,
): XmlElement | undefined {
  if (!element) return undefined;
  return childrenByLocalName(element, wantedLocalName)[0];
}

export function textContent(
  element: XmlElement | undefined,
): string | undefined {
  if (!element) return undefined;
  const chunks: string[] = [];
  for (const child of element.children) {
    if (isXmlTextNode(child)) chunks.push(child.text);
    else chunks.push(textContent(child) ?? "");
  }
  const text = chunks.join("").trim();
  return text.length > 0 ? text : undefined;
}

export function childText(
  element: XmlElement | undefined,
  wantedLocalName: string,
): string | undefined {
  return textContent(firstChildByLocalName(element, wantedLocalName));
}

export function childNumber(
  element: XmlElement | undefined,
  wantedLocalName: string,
): number | undefined {
  return numberFromText(childText(element, wantedLocalName));
}

export function childBoolean(
  element: XmlElement | undefined,
  wantedLocalName: string,
): boolean | undefined {
  return booleanFromText(childText(element, wantedLocalName));
}

export function numberFromText(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

export function booleanFromText(text: string | undefined): boolean | undefined {
  if (text === undefined) return undefined;
  if (text === "1" || text.toLowerCase() === "true") return true;
  if (text === "0" || text.toLowerCase() === "false") return false;
  return undefined;
}

export function primitiveFromText(
  text: string | undefined,
): PrimitiveXmlValue | undefined {
  if (text === undefined) return undefined;
  const bool = booleanFromText(text);
  if (bool !== undefined && /^(true|false)$/iu.test(text)) return bool;
  const n = numberFromText(text);
  if (n !== undefined && text.trim() !== "") return n;
  return text;
}

export function parseCoordinate(
  text: string | undefined,
): Coordinate | undefined {
  if (!text) return undefined;
  const parts = text
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
  const longitude = parts[0];
  const latitude = parts[1];
  if (longitude === undefined || latitude === undefined) return undefined;
  const altitude = parts[2];
  if (altitude === undefined) return { longitude, latitude };
  return { longitude, latitude, altitude };
}

export function parseLatLonAltCoordinate(
  text: string | undefined,
): Coordinate | undefined {
  if (!text) return undefined;
  const parts = text
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
  const latitude = parts[0];
  const longitude = parts[1];
  if (longitude === undefined || latitude === undefined) return undefined;
  const altitude = parts[2];
  if (altitude === undefined) return { longitude, latitude };
  return { longitude, latitude, altitude };
}

export function formatCoordinate(
  coordinate: Coordinate,
  includeAltitude = false,
): string {
  if (includeAltitude && coordinate.altitude !== undefined) {
    return `${formatNumber(coordinate.longitude)},${formatNumber(coordinate.latitude)},${formatNumber(coordinate.altitude)}`;
  }
  return `${formatNumber(coordinate.longitude)},${formatNumber(coordinate.latitude)}`;
}

export function formatLatLonAltCoordinate(coordinate: Coordinate): string {
  const altitude = coordinate.altitude ?? 0;
  return `${formatNumber(coordinate.latitude)},${formatNumber(coordinate.longitude)},${formatNumber(altitude)}`;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(15)));
}

export function extraElements(
  element: XmlElement | undefined,
  knownLocalNames: ReadonlySet<string>,
): readonly XmlElement[] {
  if (!element) return [];
  return elementChildren(element).filter(
    (child) => !knownLocalNames.has(localName(child.name)),
  );
}

export function makeElement(
  name: string,
  children: readonly XmlNode[] = [],
  attributes: Readonly<Record<string, string>> = {},
): XmlElement {
  return { kind: "element", name, attributes, children };
}

export function makeText(text: string): XmlTextNode {
  return { kind: "text", text };
}

export function makeTextElement(
  name: string,
  value: PrimitiveXmlValue,
): XmlElement {
  return makeElement(name, [
    makeText(value === true ? "1" : value === false ? "0" : String(value)),
  ]);
}

export function serializeXml(
  element: XmlElement,
  options: { readonly pretty?: boolean; readonly level?: number } = {},
): string {
  const pretty = options.pretty ?? true;
  const level = options.level ?? 0;
  const indent = pretty ? "  ".repeat(level) : "";
  const attrs = Object.entries(element.attributes)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join("");

  if (element.children.length === 0)
    return `${indent}<${element.name}${attrs}/>`;

  const onlyText = element.children.every(isXmlTextNode);
  if (onlyText) {
    const text = element.children
      .map((child) => (isXmlTextNode(child) ? child.text : ""))
      .join("");
    return `${indent}<${element.name}${attrs}>${escapeXml(text)}</${element.name}>`;
  }

  const childXml = element.children
    .map((child) => {
      if (isXmlTextNode(child)) {
        const text = child.text.trim();
        return text.length === 0
          ? ""
          : `${pretty ? "  ".repeat(level + 1) : ""}${escapeXml(text)}`;
      }
      return serializeXml(child, { pretty, level: level + 1 });
    })
    .filter((line) => line.length > 0)
    .join(pretty ? "\n" : "");

  if (pretty)
    return `${indent}<${element.name}${attrs}>\n${childXml}\n${indent}</${element.name}>`;
  return `${indent}<${element.name}${attrs}>${childXml}</${element.name}>`;
}

export function serializeDocument(root: XmlElement, pretty = true): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializeXml(root, { pretty })}`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

export function decodeXml(value: string): string {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, "&");
}

export function compactObject<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function mergeDefined<T extends Record<string, unknown>>(
  left: T,
  right: T,
): T {
  const out = { ...left };
  for (const [key, value] of Object.entries(right) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
