import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api";
import type { AdminUser } from "@droneroute/shared";

export function AdminPage() {
  const setCurrentPage = useMissionStore((s) => s.setCurrentPage);
  const currentUserId = useAuthStore((s) => s.userId);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers(page, perPage);
      setUsers(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAction = async (action: () => Promise<any>) => {
    try {
      await action();
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "Z");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage("editor")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <h1 className="text-lg font-semibold">User management</h1>
            </div>
            <span className="text-xs text-muted-foreground">
              {total} user{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={loadUsers}
                >
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            )}

            {!loading && !error && users.length > 0 && (
              <>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Signed up
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Routes
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isSelf = user.id === currentUserId;
                        return (
                          <tr
                            key={user.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{user.email}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    you
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-center text-xs tabular-nums">
                              {user.missionCount}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {user.isAdmin && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                                    <Shield className="h-3 w-3" />
                                    Admin
                                  </span>
                                )}
                                {user.isBanned && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                                    <Ban className="h-3 w-3" />
                                    Banned
                                  </span>
                                )}
                                {!user.isAdmin && !user.isBanned && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Active
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!isSelf && (
                                <div className="flex items-center justify-end gap-1">
                                  {user.isBanned ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                                      disabled={actionLoading === user.id}
                                      onClick={() => {
                                        setActionLoading(user.id);
                                        handleAction(() =>
                                          adminApi.unbanUser(user.id),
                                        );
                                      }}
                                      title="Unban user"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Unban
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-red-400 hover:text-red-300"
                                      disabled={actionLoading === user.id}
                                      onClick={() => {
                                        setActionLoading(user.id);
                                        handleAction(() =>
                                          adminApi.banUser(user.id),
                                        );
                                      }}
                                      title="Ban user"
                                    >
                                      <Ban className="h-3.5 w-3.5 mr-1" />
                                      Ban
                                    </Button>
                                  )}
                                  {user.isAdmin ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-amber-400 hover:text-amber-300"
                                      disabled={actionLoading === user.id}
                                      onClick={() => {
                                        setActionLoading(user.id);
                                        handleAction(() =>
                                          adminApi.demoteUser(user.id),
                                        );
                                      }}
                                      title="Demote from admin"
                                    >
                                      <ShieldOff className="h-3.5 w-3.5 mr-1" />
                                      Demote
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-purple-400 hover:text-purple-300"
                                      disabled={actionLoading === user.id}
                                      onClick={() => {
                                        setActionLoading(user.id);
                                        handleAction(() =>
                                          adminApi.promoteUser(user.id),
                                        );
                                      }}
                                      title="Promote to admin"
                                    >
                                      <Shield className="h-3.5 w-3.5 mr-1" />
                                      Promote
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
