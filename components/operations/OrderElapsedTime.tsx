export default function OrderElapsedTime({ createdAt }: { createdAt: string }) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
  );

  return (
    <span className="text-sm font-semibold text-neutral-500">
      {minutes < 1 ? "Recién ingresado" : `${minutes} min esperando`}
    </span>
  );
}
