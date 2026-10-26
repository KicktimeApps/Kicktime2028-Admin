import { ScanFace, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { usePin } from "@/lib/pin";
import {
  deletePasskey,
  faceIdSupported,
  listPasskeys,
  registerFaceId,
  type TeamPasskey,
} from "@/services/passkey";
import { useCachedState, useLoadOnce } from "@/lib/page-cache";
import { ActionButton, Card, ConfirmButton } from "./shared";
import { fmtTime, useAction } from "./use-action";

/**
 * Face ID einrichten (nur nach Entsperren mit PIN) und eingerichtete Geräte
 * verwalten. Ein Passkey gilt nur für die Adresse, unter der er eingerichtet
 * wurde – nach einem Umzug der Team-App neu einrichten.
 */
export function FaceIdCard() {
  const pin = usePin();
  const viaFaceId = pin.startsWith("s1.");
  const { busy, run } = useAction();
  const [list, setList] = useCachedState<TeamPasskey[] | null | undefined>("passkeys", undefined);
  const [registering, setRegistering] = useState(false);
  const load = useCallback(async () => {
    const res = await listPasskeys(pin);
    if (res.ok) setList(res.data.data);
  }, [pin, setList]);
  useLoadOnce("passkeys", load);

  const register = async () => {
    setRegistering(true);
    const err = await registerFaceId(pin);
    setRegistering(false);
    if (err === "cancelled") return;
    if (err) {
      haptics.warn();
      toast.error("Face ID", { description: err });
      return;
    }
    haptics.success();
    toast.success("Face ID ist eingerichtet", {
      description: "Beim nächsten Öffnen reicht ein Blick.",
    });
    await load();
  };

  const here = (list ?? []).filter((p) => p.here);
  const elsewhere = (list ?? []).filter((p) => !p.here);

  return (
    <Card
      title="Face ID"
      text="Statt der PIN mit Face ID (bzw. Fingerabdruck) entsperren. Die PIN bleibt als Notweg."
      action={<ScanFace className="h-5 w-5 text-primary" />}
    >
      {list === null ? (
        <p className="rounded-xl bg-gold/10 px-3 py-2 text-[13px]">
          Noch nicht eingerichtet – das SQL-Update „Face ID“ fehlt.
        </p>
      ) : !faceIdSupported() ? (
        <p className="text-[12.5px] text-muted-foreground">
          Dieser Browser kann keine Passkeys. Auf dem iPhone die Team-App vom Home-Bildschirm
          öffnen.
        </p>
      ) : viaFaceId ? (
        <p className="text-[12.5px] text-muted-foreground">
          Mit Face ID entsperrt. Ein weiteres Gerät einrichten geht nur nach Entsperren mit der PIN.
        </p>
      ) : (
        <ActionButton
          variant="primary"
          className="w-full"
          icon={<ScanFace />}
          busy={registering}
          onClick={() => void register()}
        >
          Face ID auf diesem Gerät einrichten
        </ActionButton>
      )}

      {here.length > 0 && (
        <ul className="space-y-1.5">
          {here.map((p) => (
            <PasskeyRow
              key={p.id}
              p={p}
              busy={busy === `del-${p.id}`}
              onDelete={async () => {
                if (await run(`del-${p.id}`, () => deletePasskey(pin, p.id), "Face ID entfernt"))
                  await load();
              }}
            />
          ))}
        </ul>
      )}
      {elsewhere.length > 0 && (
        <p className="text-[12px] text-muted-foreground">
          Dazu {elsewhere.length} {elsewhere.length === 1 ? "Gerät" : "Geräte"} für eine andere
          Adresse der Team-App ({[...new Set(elsewhere.map((p) => p.rp_id))].join(", ")}).
        </p>
      )}
    </Card>
  );
}

function PasskeyRow({
  p,
  busy,
  onDelete,
}: {
  p: TeamPasskey;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-subtle px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{p.label ?? "Gerät"}</div>
        <div className="text-[11.5px] text-muted-foreground">
          eingerichtet {fmtTime(p.created_at)}
          {p.last_used_at ? ` · zuletzt ${fmtTime(p.last_used_at)}` : " · noch nicht benutzt"}
        </div>
      </div>
      <ConfirmButton
        variant="danger-outline"
        className="h-8 w-8 shrink-0 px-0"
        icon={<Trash2 />}
        busy={busy}
        title={`„${p.label ?? "Gerät"}“ entfernen?`}
        text="Dieses Gerät kann sich danach nicht mehr mit Face ID entsperren – nur noch mit der PIN. Eine laufende Face-ID-Freigabe endet sofort."
        confirm="Entfernen"
        onConfirm={onDelete}
      >
        <span className="sr-only">Entfernen</span>
      </ConfirmButton>
    </li>
  );
}
