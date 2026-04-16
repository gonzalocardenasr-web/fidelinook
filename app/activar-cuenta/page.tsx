import { Suspense } from "react";
import ActivarCuentaForm from "./ActivarCuentaForm";

export default function ActivarCuentaPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <ActivarCuentaForm />
    </Suspense>
  );
}