import { Loader2 } from "lucide-react";

export default function Loader({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
