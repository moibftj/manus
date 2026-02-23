/**
 * LetterPaywall — shown when a letter is in `generated_locked` status.
 *
 * Displays a blurred preview of the AI-generated letter with a prominent
 * "Unlock & Send for Attorney Review" call-to-action. The subscriber must
 * pay to transition the letter to `pending_review`.
 */
import { useState } from "react";
import { Lock, Sparkles, CheckCircle, ArrowRight, Shield, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LetterPaywallProps {
  letterId: number;
  letterType: string;
  subject: string;
}

const SAMPLE_PREVIEW = `Dear [Recipient],

This letter serves as formal legal notice regarding the matter described herein. 
Based on our research of applicable statutes and case law in your jurisdiction, 
you have the following legal rights and remedies available to you...

[Full letter continues — unlock to reveal complete attorney-reviewed content]

The applicable regulations under [Jurisdiction] law provide clear guidance on 
this matter. Our research has identified [N] relevant statutes and precedents 
that support your position...

Sincerely,
[Attorney Signature]`;

export function LetterPaywall({ letterId, letterType, subject }: LetterPaywallProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const payToUnlock = trpc.billing.payToUnlock.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error("Payment setup failed", { description: err.message });
      setIsRedirecting(false);
    },
  });

  const handleUnlock = () => {
    payToUnlock.mutate({ letterId });
  };

  const isPending = payToUnlock.isPending || isRedirecting;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Your letter is ready!</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Our AI has completed a 3-stage legal research and drafting process. Unlock to send for attorney review.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs whitespace-nowrap">
          Ready to Unlock
        </Badge>
      </div>

      {/* Blurred Preview */}
      <Card className="relative overflow-hidden border-2 border-dashed border-amber-200">
        <CardHeader className="pb-3 bg-gradient-to-b from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <FileText className="w-4 h-4 text-amber-600" />
              AI-Generated Letter Preview
            </CardTitle>
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {/* Blurred letter content */}
          <div className="relative">
            <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed blur-[6px] select-none pointer-events-none">
              {SAMPLE_PREVIEW}
            </pre>
            {/* Gradient fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/90 rounded" />
          </div>

          {/* Lock overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-b-lg">
            <div className="text-center space-y-4 p-6 max-w-sm">
              <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Letter Ready for Review</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlock your letter to send it to a licensed attorney for review and approval.
                </p>
              </div>
              <Button
                onClick={handleUnlock}
                disabled={isPending}
                size="lg"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-lg"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Redirecting to payment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Unlock & Send for Review
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">$29 one-time · Secure payment via Stripe</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground">What happens after you unlock?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                icon: ArrowRight,
                color: "text-blue-600",
                bg: "bg-blue-50",
                title: "Sent to Attorney Queue",
                desc: "Your letter enters our licensed attorney review queue immediately.",
              },
              {
                icon: Shield,
                color: "text-purple-600",
                bg: "bg-purple-50",
                title: "Attorney Reviews & Approves",
                desc: "A licensed attorney reviews, edits if needed, and approves your letter.",
              },
              {
                icon: Clock,
                color: "text-green-600",
                bg: "bg-green-50",
                title: "Typically within 24–48 hours",
                desc: "You'll receive email notification when your letter is approved.",
              },
              {
                icon: CheckCircle,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                title: "Download Your Final Letter",
                desc: "Access and download your attorney-approved professional legal letter.",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: "Secure Payment", sub: "256-bit SSL" },
          { icon: CheckCircle, label: "Licensed Attorneys", sub: "Bar-certified" },
          { icon: Clock, label: "Fast Turnaround", sub: "24–48 hours" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-3 bg-muted/30 rounded-lg text-center">
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
