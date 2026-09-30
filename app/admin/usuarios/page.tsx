import Link from "next/link";

import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";

import UsersManagementClient from "./UsersManagementClient";

export const dynamic = "force-dynamic";

export default async function UsersManagementPage() {
  const session = await getOperationSession();
  const authorization = authorizeOperationSession(session, "users.manage");

  if (!authorization.ok) {
    return (
      <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">
                Plataforma Nook
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                GestiÃ³n de usuarios
              </h1>
            </div>

            <div className="px-6 py-7 md:px-8 md:py-8">
              <div className="rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-4 text-sm text-[#8A3550]">
                No tienes permisos para acceder a esta secciÃ³n.
              </div>

              <Link
                href="/operacion"
                className="mt-6 inline-flex rounded-xl bg-[#4C00F7] px-4 py-3 text-sm font-semibold text-white"
              >
                Volver a OperaciÃ³n
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <UsersManagementClient
      currentUserId={authorization.session.userId}
      currentDisplayName={authorization.session.displayName}
    />
  );
}

