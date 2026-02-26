import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Scale, Shield, Zap, Gift } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PLANS = [
  {
    id: "free_trial",
    name: "Free Trial",
    price: "$0",
    period: "first letter",
    reviewFee: "$50 attorney review",
    description: "Generate your first AI draft for free, then pay $50 for attorney review",
    badge: null,
    features: [
      "1 AI-generated legal letter draft",
      "3-stage legal research pipeline",
      "Full draft readable before paying",
      "$50 for attorney review & approval",
      "Attorney-approved PDF delivered",
    ],
    cta: "Start Free",
    highlight: false,
    isFree: true,
  },
  {
    id: "per_letter",
    name: "Pay Per Letter",
    price: "$200",
    period: "per letter",
    reviewFee: "Attorney review included",
    description: "One professional legal letter with full attorney review, no commitment",
    badge: null,
    features: [
      "1 professional legal letter",
      "3-stage AI legal research pipeline",
      "Attorney review & approval included",
      "Attorney-approved PDF delivered",
      "Email delivery",
    ],
    cta: "Get This Letter",
    highlight: false,
    isFree: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$499",
    period: "per month",
    reviewFee: "Attorney review included",
    description: "4 attorney-reviewed letters per month for active legal needs",
    badge: "Most Popular",
    features: [
      "4 legal letters per month",
      "Attorney review & approval included",
      "3-stage AI legal research pipeline",
      "All letter types supported",
      "Attorney-approved PDF for each letter",
      "Email delivery",
      "Cancel anytime",
    ],
    cta: "Subscribe Starter",
    highlight: true,
    isFree: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$799",
    period: "per month",
    reviewFee: "Attorney review included",
    description: "8 attorney-reviewed letters per month for high-volume legal needs",
    badge: "Best Value",
    features: [
      "8 legal letters per month",
      "Attorney review & approval included",
      "3-stage AI legal research pipeline",
      "All letter types supported",
      "Attorney-approved PDF for each letter",
      "Priority attorney queue",
      "Email delivery",
      "Dedicated support",
      "Cancel anytime",
    ],
    cta: "Subscribe Professional",
    highlight: false,
    isFree: false,
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to secure checkout...");
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create checkout session");
    },
  });

  const handleSelectPlan = (planId: string, isFree: boolean) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (isFree) {
      navigate("/submit-letter");
      return;
    }
    checkoutMutation.mutate({ planId });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Scale className="w-12 h-12 text-[#3b82f6]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Professional Legal Letters</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            AI-powered legal drafting with mandatory attorney review. Start free, then choose the plan that fits your needs.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.highlight
                  ? "border-[#3b82f6] shadow-lg shadow-blue-500/20 scale-105"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={plan.highlight ? "bg-[#3b82f6] text-white" : "bg-amber-500 text-white"}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {plan.isFree && <Gift className="w-4 h-4 text-emerald-500" />}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                {plan.reviewFee && (
                  <p className={`text-xs mt-1 font-medium ${plan.isFree ? "text-amber-600" : "text-emerald-600"}`}>
                    {plan.reviewFee}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.highlight ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white" : ""} ${plan.isFree ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  variant={plan.highlight || plan.isFree ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id, plan.isFree)}
                  disabled={checkoutMutation.isPending && !plan.isFree}
                >
                  {checkoutMutation.isPending && checkoutMutation.variables?.planId === plan.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing comparison note */}
        <div className="mt-10 p-5 bg-muted/30 border border-border rounded-xl max-w-2xl mx-auto text-center">
          <h3 className="font-semibold text-foreground mb-2">How the Free Trial Works</h3>
          <p className="text-sm text-muted-foreground">
            Generate your first letter draft completely free using our 3-stage AI pipeline.
            Read the full draft before committing. When you're ready to send, pay just <strong>$50</strong> for a licensed attorney to review, edit, and approve it.
            After your free trial, choose a subscription or pay <strong>$200</strong> per letter.
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-8 h-8 text-[#3b82f6]" />
            <h3 className="font-semibold">Attorney Reviewed</h3>
            <p className="text-sm text-muted-foreground">Every letter reviewed and approved by a licensed attorney before delivery</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="w-8 h-8 text-amber-500" />
            <h3 className="font-semibold">3-Stage AI Pipeline</h3>
            <p className="text-sm text-muted-foreground">Perplexity research + Claude drafting + Claude final polish for every letter</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Scale className="w-8 h-8 text-green-500" />
            <h3 className="font-semibold">Secure & Confidential</h3>
            <p className="text-sm text-muted-foreground">Your legal matters are handled with strict confidentiality and 256-bit SSL</p>
          </div>
        </div>

        {/* Test card notice */}
        <div className="mt-12 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Testing:</strong> Use card number <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">4242 4242 4242 4242</code> with any future expiry and CVC.
          </p>
        </div>
      </div>
    </div>
  );
}
