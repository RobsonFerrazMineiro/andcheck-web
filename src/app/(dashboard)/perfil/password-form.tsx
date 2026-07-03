"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeMyPassword,
  type PasswordChangeState,
} from "@/lib/actions/profile-actions";
import { toast } from "sonner";

const INITIAL_STATE: PasswordChangeState = {
  status: "idle",
  message: "",
};

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    changeMyPassword,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <PasswordField
          id="currentPassword"
          label="Senha atual"
          autoComplete="current-password"
        />
        <PasswordField
          id="newPassword"
          label="Nova senha"
          autoComplete="new-password"
        />
        <PasswordField
          id="confirmPassword"
          label="Confirmar nova senha"
          autoComplete="new-password"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground">
          Mínimo de 8 caracteres. A senha atual nunca é exibida ou registrada.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
}: {
  id: string;
  label: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
      />
    </div>
  );
}
