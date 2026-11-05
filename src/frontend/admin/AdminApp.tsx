import { AdminAuthGate } from "./auth/AdminAuthGate";
import { AdminWorkspace } from "./AdminWorkspace";

export function AdminApp() {
  return (
    <AdminAuthGate>
      {({ admin, signOut }) => (
        <AdminWorkspace key={admin.id} admin={admin} onSignOut={signOut} />
      )}
    </AdminAuthGate>
  );
}
