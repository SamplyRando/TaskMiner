import { useEffect, useRef, useState } from "react";

import {
  createGoogleAuthAttempt,
  createGoogleLinkAttempt,
  linkGoogleAccount,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from "@/lib/google-identity";
import { useAuthStore } from "@/store/auth-store";
import type { GoogleAuthResponse, GoogleLinkResponse } from "@/types/auth";

type GoogleAuthButtonProps =
  | {
      mode: "authenticate";
      onSuccess: (result: GoogleAuthResponse) => Promise<void> | void;
    }
  | {
      mode: "link";
      onSuccess: (result: GoogleLinkResponse) => Promise<void> | void;
    };

const getErrorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "La connexion à Google n’a pas pu être chargée. Réessayez.";

export function GoogleAuthButton(props: GoogleAuthButtonProps) {
  const { mode, onSuccess } = props;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const submittingRef = useRef(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const [isPreparing, setIsPreparing] = useState(Boolean(clientId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    let observer: ResizeObserver | null = null;

    const prepare = async () => {
      try {
        const [google, attempt] = await Promise.all([
          loadGoogleIdentity(),
          mode === "link"
            ? createGoogleLinkAttempt()
            : createGoogleAuthAttempt(),
        ]);
        if (!active || !containerRef.current) return;

        const handleCredential = async (response: GoogleCredentialResponse) => {
          if (!active || submittingRef.current || !response.credential) return;
          submittingRef.current = true;
          setIsSubmitting(true);
          setError(null);
          try {
            const data = {
              attemptId: attempt.attempt_id,
              nonce: attempt.nonce,
              credential: response.credential,
            };
            if (mode === "link") {
              const callback = onSuccessRef.current as (
                result: GoogleLinkResponse,
              ) => Promise<void> | void;
              await callback(await linkGoogleAccount(data));
            } else {
              const callback = onSuccessRef.current as (
                result: GoogleAuthResponse,
              ) => Promise<void> | void;
              await callback(await loginWithGoogle(data));
            }
          } catch (authenticationError) {
            setError(getErrorMessage(authenticationError));
          } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
          }
        };

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => void handleCredential(response),
          nonce: attempt.nonce,
          ux_mode: "popup",
          context: "signin",
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const render = () => {
          const container = containerRef.current;
          if (!active || !container) return;
          container.replaceChildren();
          const measuredWidth = Math.floor(
            container.getBoundingClientRect().width,
          );
          google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "fr",
            width: Math.min(400, Math.max(240, measuredWidth || 320)),
          });
        };
        render();
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(render);
          observer.observe(containerRef.current);
        }
        setIsPreparing(false);
      } catch (preparationError) {
        if (!active) return;
        setError(getErrorMessage(preparationError));
        setIsPreparing(false);
      }
    };

    void prepare();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [attemptKey, clientId, loginWithGoogle, mode]);

  if (!clientId) return null;

  return (
    <div className="space-y-2">
      <div className="relative min-h-11 w-full" aria-busy={isSubmitting}>
        <div
          aria-label="Continuer avec Google"
          className={
            isPreparing || isSubmitting || error
              ? "invisible"
              : "flex w-full justify-center"
          }
          ref={containerRef}
        />
        {isPreparing || isSubmitting ? (
          <div className="bg-background absolute inset-0 flex min-h-11 items-center justify-center rounded-md border text-sm font-medium">
            <Spinner
              label={
                isSubmitting ? "Connexion avec Google" : "Chargement de Google"
              }
            />
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="space-y-2" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            className="w-full"
            onClick={() => {
              setError(null);
              setIsPreparing(true);
              setAttemptKey((current) => current + 1);
            }}
            type="button"
            variant="outline"
          >
            Réessayer avec Google
          </Button>
        </div>
      ) : null}
      <p className="text-muted-foreground text-center text-xs">
        Si vous fermez la fenêtre Google, vous restez sur cette page et pouvez
        réessayer.
      </p>
    </div>
  );
}
