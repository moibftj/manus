/**
 * LetterPaywall — shown when a letter is in `generated_locked` status.
 *
 * Simplified flow (Phase 69):
 *   - Every letter ends at generated_locked after the AI pipeline.
 *   - Subscriber sees the first ~35% of the draft clearly; the rest is blurred.
 *   - Single CTA: pay $200 to submit for attorney review.
 *   - Promo code field reduces the price via Stripe discount.
 *   - Stripe webhook transitions generated_locked → pending_review on payment.
 */
import { useState } from "react";
import {
  Lock, CheckCircle, ArrowRight, Shield, Gavel, Tag, X,
  FileText, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LetterPaywallProps {
  letterId: number;
  letterType: string;
  subject: string;
  /** The actual AI draft content from letter_versions (ai_draft) */
  draftContent?: string;
}

export function LetterPaywall({ letterId, draftContent }: LetterPaywallProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Promo code validation
  const validateCodeQuery = trpc.affiliate.validateCode.useQuery(
    { code: promoInput.trim().toUpperCase() },
    { enabled: false }
  );

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validateCodeQuery.refetch();
      if (result.data?.valid) {
        setAppliedCode(code);
        setAppliedDiscount(result.data.discountPercent);
        toast.success(`Promo code applied — ${result.data.discountPercent}% off!`);
      } else {
        setPromoError("Invalid or expired promo code.");
        setAppliedCode(null);
        setAppliedDiscount(0);
      }
    } catch {
      setPromoError("Could not validate code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedCode(null);
    setAppliedDiscount(0);
    setPromoInput("");
    setPromoError(null);
  };

  // $200 pay-per-letter checkout
  const payToUnlock = trpc.billing.payToUnlock.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error("Payment could not be initiated", { description: err.message || "Please try again in a moment." });
      setIsRedirecting(false);
    },
  });

  const isPending = payToUnlock.isPending || isRedirecting;

  // Split draft into visible (first ~35%) and blurred remainder
  const previewLines = draftContent?.split("\n") ?? [];
  const visibleLineCount = Math.max(8, Math.floor(previewLines.length * 0.35));
  const visibleText = previewLines.slice(0, visibleLineCount).join("\n");
  const blurredText = previewLines.slice(visibleLineCount).join("\n");
  const hasDraft = previewLines.length > 0;

  const discountedPrice = appliedDiscount > 0
    ? Math.round(200 * (1 - appliedDiscount / 100))
    : null;

  return (
    <div className="space-y-5">

      {/* ── Draft Preview (blurred) ── */}
      {hasDraft && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-xl">
            {/* Visible portion */}
            <div className="p-5 pb-0">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Draft Preview</span>
                <span className="text-xs text-muted-foreground ml-auto">(partial — attorney review required)</span>
              </div>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {visibleText}
              </pre>
            </div>

            {/* Blurred portion */}
            {blurredText && (
              <div className="relative">
                <pre
                  className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed p-5 pt-0 select-none"
                  style={{
                    filter: showFullPreview ? "none" : "blur(6px)",
                    userSelect: "none",
                    transition: "filter 0.3s ease",
                  }}
                  aria-hidden={!showFullPreview}
                >
                  {blurredText}
                </pre>

                {/* Gradient overlay + unlock prompt */}
                {!showFullPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background/95 via-background/60 to-transparent">
                    <div className="flex flex-col items-center gap-2 mt-8">
                      <Lock className="w-8 h-8 text-muted-foreground/60" />
                      <p className="text-sm font-medium text-muted-foreground text-center px-4">
                        Full draft available after attorney review payment
                      </p>
                      <button
                        onClick={() => setShowFullPreview(true)}
                        className="text-xs text-primary underline underline-offset-2 flex items-center gap-1 mt-1"
                      >
                        <Eye className="w-3 h-3" />
                        Preview blurred text
                      </button>
                    </div>
                  </div>
                )}

                {showFullPreview && (
                  <div className="flex justify-center pb-3">
                    <button
                      onClick={() => setShowFullPreview(false)}
                      className="text-xs text-muted-foreground underline underline-offset-2 flex items-center gap-1"
                    >
                      <EyeOff className="w-3 h-3" />
                      Hide preview
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Attorney Review CTA ── */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Submit for Attorney Review</h2>
            <p className="text-sm text-white/80 mt-1">
              A licensed attorney will review your draft, make any necessary edits, and approve the final letter.
              You receive the professionally formatted PDF once approved.
            </p>
          </div>
        </div>

        {/* What's included */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { icon: Shield, text: "Licensed attorney review" },
            { icon: CheckCircle, text: "Edits & approval included" },
            { icon: FileText, text: "Professional PDF delivered" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Icon className="w-4 h-4 text-white/80 flex-shrink-0" />
              <span className="text-xs text-white/90">{text}</span>
            </div>
          ))}
        </div>

        {/* Promo code */}
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Have a promo code?
          </p>
          {appliedCode ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-sm font-semibold text-white flex-1">
                {appliedCode} — {appliedDiscount}% off applied
              </span>
              <button
                onClick={handleRemovePromo}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Remove promo code"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  setPromoError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                placeholder="Enter code (e.g. SAVE20)"
                className="h-9 text-sm font-mono uppercase tracking-wider bg-white/10 border-white/20 text-white placeholder:text-white/40"
                maxLength={32}
              />
              <Button
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoLoading}
                variant="outline"
                size="sm"
                className="h-9 px-4 bg-white/10 border-white/30 text-white hover:bg-white/20 whitespace-nowrap"
              >
                {promoLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-xs text-red-300 flex items-center gap-1">
              <X className="w-3 h-3" />
              {promoError}
            </p>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {discountedPrice !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">${discountedPrice}</span>
                <span className="text-lg text-white/50 line-through">${200}</span>
                <span className="text-sm text-emerald-300 font-semibold">{appliedDiscount}% off</span>
              </div>
            ) : (
              <span className="text-3xl font-extrabold text-white">$200</span>
            )}
            <p className="text-xs text-white/60 mt-0.5">One-time · Includes attorney review + PDF</p>
          </div>

          <Button
            onClick={() => payToUnlock.mutate({ letterId, discountCode: appliedCode ?? undefined })}
            disabled={isPending}
            size="lg"
            className="bg-white text-blue-800 hover:bg-white/90 font-bold shadow-md w-full sm:w-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-800 rounded-full animate-spin" />
                Preparing checkout...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                Pay & Submit for Review
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
