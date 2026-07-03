"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveNotification,
  markNotificationAsRead,
} from "@/lib/actions/notification-actions";
import { typography } from "@/lib/design-system";

export function NotificationListActions({
  id,
  title,
  href,
  status,
}: {
  id: string;
  title: string;
  href: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);

  function markRead() {
    startTransition(async () => {
      try {
        await markNotificationAsRead(id);
        toast.success("Notificação marcada como lida.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível marcar como lida.",
        );
      }
    });
  }

  function archive() {
    startTransition(async () => {
      try {
        await archiveNotification(id);
        toast.success("Notificação arquivada.");
        setArchiveOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível arquivar a notificação.",
        );
      }
    });
  }

  return (
    <>
      <ConfirmDialog
        open={archiveOpen}
        title="Arquivar notificação"
        description="A notificação será removida da central principal."
        details={
          <p className={`${typography.bodyStrong} text-foreground`}>{title}</p>
        }
        confirmLabel="Arquivar"
        destructive
        pending={isPending}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={archive}
      />
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Button
          asChild
          size="sm"
          className={`h-8 gap-1.5 rounded-md px-3 ${typography.action}`}
        >
          <Link href={href}>
            <ExternalLink className="size-3.5" />
            Abrir
          </Link>
        </Button>
        {status !== "READ" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={markRead}
            className={`h-8 gap-1.5 rounded-md border border-border/70 px-3 ${typography.action}`}
          >
            <Check className="size-3.5" />
            Lida
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setArchiveOpen(true)}
          className={`h-8 gap-1.5 rounded-md border border-border/70 px-3 ${typography.action}`}
        >
          <Archive className="size-3.5" />
          Arquivar
        </Button>
      </div>
    </>
  );
}
