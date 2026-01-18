// // app/subscribe/page.tsx - COMPLETE WORKING VERSION
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { useUser } from "@clerk/nextjs";
// import {
//   Elements,
//   CardElement,
//   useStripe,
//   useElements
// } from "@stripe/react-stripe-js";
// import { loadStripe } from "@stripe/stripe-js";

// // Initialize Stripe - MUST load with your publishable key
// const stripePromise = loadStripe(
//   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
// );

// // Price IDs for your AI Sandbox plans
// const PLANS = {
//   basic: {
//     monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY!,
//     name: "AI Sandbox Basic",
//     price: "$29",
//     features: [
//       "3 Specialized GPTs",
//       "Sales, Support, Content AI",
//       "1,000 AI credits/month",
//       "Basic agent templates",
//       "Community support"
//     ]
//   },
//   pro: {
//     monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!,
//     name: "AI Sandbox Pro",
//     price: "$99",
//     features: [
//       "6 Specialized GPTs",
//       "All Basic GPTs + Analysis, Creative, Technical",
//       "10,000 AI credits/month",
//       "All premium templates",
//       "Priority support",
//       "Custom agent training",
//       "API access"
//     ]
//   }
// };
// // Main form component
// function CheckoutForm() {
//   const stripe = useStripe();
//   const elements = useElements();
//   const { user } = useUser();
//   const router = useRouter();

//   const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("basic");
//   const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
//     "monthly"
//   );
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string>("");
//   const [success, setSuccess] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!stripe || !elements || !user) return;

//     setLoading(true);
//     setError("");

//     try {
//       // 1. Get card element
//       const cardElement = elements.getElement(CardElement);
//       if (!cardElement) throw new Error("Card element not found");

//       // 2. Create payment method
//       const { error: stripeError, paymentMethod } =
//         await stripe.createPaymentMethod({
//           type: "card",
//           card: cardElement,
//           billing_details: {
//             email: user.primaryEmailAddress?.emailAddress,
//             name: user.fullName || "AI Sandbox User"
//           }
//         });

//       if (stripeError)
//         throw new Error(stripeError.message || "Card validation failed");

//       // 3. Get selected price ID
//       const priceId = PLANS[selectedPlan].monthly;

//       // 4. Store in Clerk unsafe metadata
//       await user.update({
//         unsafeMetadata: {
//           ...user.unsafeMetadata,
//           stripePaymentMethodId: paymentMethod.id,
//           selectedPriceId: priceId,
//           selectedPlan: selectedPlan,
//           billingCycle: billingCycle,
//           subscriptionStatus: "pending"
//         }
//       });

//       // 5. Call your Convex backend to create subscription
//       const response = await fetch("/api/create-subscription", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           clerkUserId: user.id,
//           stripePaymentMethodId: paymentMethod.id,
//           priceId: priceId,
//           email: user.primaryEmailAddress?.emailAddress
//         })
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Subscription creation failed");
//       }

//       // 6. Handle 3D Secure if required
//       if (result.requiresAction) {
//         const { error: confirmError } = await stripe.confirmCardPayment(
//           result.clientSecret
//         );

//         if (confirmError) throw new Error(confirmError.message);
//       }

//       // 7. Success!
//       setSuccess(true);
//       setTimeout(() => {
//         router.push("/dashboard?welcome=true");
//       }, 2000);
//     } catch (err: any) {
//       console.error("Subscription error:", err);
//       setError(err.message || "Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (success) {
//     return (
//       <div className="max-w-md mx-auto mt-20 text-center">
//         <div className="animate-pulse">
//           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
//             <svg
//               className="w-8 h-8 text-green-600"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M5 13l4 4L19 7"
//               />
//             </svg>
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 mb-3">
//             Subscription Activated! 🎉
//           </h2>
//           <p className="text-gray-600">
//             Welcome to {PLANS[selectedPlan].name}! Redirecting to your
//             dashboard...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-12">
//       <div className="text-center mb-12">
//         <h1 className="text-4xl font-bold text-gray-900 mb-4">
//           Choose Your AI Sandbox Plan
//         </h1>
//         <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//           Start building intelligent AI agents with no code. Cancel anytime.
//         </p>
//       </div>

//       <div className="grid md:grid-cols-2 gap-8">
//         {/* Plan Selection */}
//         <div className="space-y-6">
//           <div className="flex space-x-4 mb-6">
//             <button
//               onClick={() => setBillingCycle("monthly")}
//               className={`flex-1 py-3 px-4 rounded-lg font-medium ${
//                 billingCycle === "monthly"
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//               }`}
//             >
//               Monthly Billing
//             </button>
//             <button
//               onClick={() => setBillingCycle("yearly")}
//               className={`flex-1 py-3 px-4 rounded-lg font-medium ${
//                 billingCycle === "yearly"
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//               }`}
//             >
//               Yearly Billing
//               <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
//                 Save 20%
//               </span>
//             </button>
//           </div>

//           {/* Plan Cards */}
//           {(["basic", "pro"] as const).map((plan) => (
//             <div
//               key={plan}
//               onClick={() => setSelectedPlan(plan)}
//               className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
//                 selectedPlan === plan
//                   ? "border-blue-500 bg-blue-50"
//                   : "border-gray-200 hover:border-gray-300"
//               }`}
//             >
//               <div className="flex justify-between items-start mb-4">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">
//                     {PLANS[plan].name}
//                   </h3>
//                   <div className="mt-2">
//                     <span className="text-3xl font-bold">
//                       {billingCycle === "monthly"
//                         ? PLANS[plan].price
//                         : `$${Math.round(parseInt(PLANS[plan].price.slice(1)) * 12 * 0.8)}`}
//                     </span>
//                     <span className="text-gray-600 ml-2">
//                       /{billingCycle === "monthly" ? "month" : "year"}
//                     </span>
//                   </div>
//                 </div>
//                 {selectedPlan === plan && (
//                   <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
//                     Selected
//                   </div>
//                 )}
//               </div>

//               <ul className="space-y-3 mb-6">
//                 {PLANS[plan].features.map((feature, idx) => (
//                   <li key={idx} className="flex items-start">
//                     <svg
//                       className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
//                       fill="currentColor"
//                       viewBox="0 0 20 20"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                     <span>{feature}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           ))}
//         </div>

//         {/* Payment Form */}
//         <div className="bg-white border border-gray-200 rounded-xl p-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">
//             Payment Details
//           </h2>
//           <p className="text-gray-600 mb-8">
//             Enter your card information to start your {PLANS[selectedPlan].name}{" "}
//             plan
//           </p>

//           <form onSubmit={handleSubmit}>
//             {/* Card Element */}
//             <div className="mb-8">
//               <label className="block text-sm font-medium text-gray-700 mb-3">
//                 Credit or debit card
//               </label>
//               <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
//                 <CardElement
//                   options={{
//                     style: {
//                       base: {
//                         fontSize: "16px",
//                         color: "#424770",
//                         "::placeholder": {
//                           color: "#aab7c4"
//                         },
//                         iconColor: "#667eea"
//                       },
//                       invalid: {
//                         color: "#9e2146"
//                       }
//                     },
//                     hidePostalCode: true
//                   }}
//                 />
//               </div>

//               {/* Test Card Info */}
//               <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                 <p className="text-sm font-medium text-yellow-800 mb-2">
//                   🧪 Testing Card Numbers
//                 </p>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <code className="bg-gray-100 px-2 py-1 rounded">
//                       4242 4242 4242 4242
//                     </code>
//                     <p className="text-gray-600 text-xs mt-1">Visa (success)</p>
//                   </div>
//                   <div>
//                     <code className="bg-gray-100 px-2 py-1 rounded">
//                       4000 0000 0000 3220
//                     </code>
//                     <p className="text-gray-600 text-xs mt-1">3D Secure</p>
//                   </div>
//                   <div>
//                     <code className="bg-gray-100 px-2 py-1 rounded">
//                       4000 0000 0000 9995
//                     </code>
//                     <p className="text-gray-600 text-xs mt-1">Declined</p>
//                   </div>
//                   <div>
//                     <p className="text-gray-600 text-xs">
//                       Expiry: 12/34
//                       <br />
//                       CVC: 123
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Order Summary */}
//             <div className="border-t border-gray-200 pt-6 mb-8">
//               <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
//               <div className="space-y-3">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">
//                     {PLANS[selectedPlan].name}
//                   </span>
//                   <span className="font-medium">
//                     {billingCycle === "monthly"
//                       ? PLANS[selectedPlan].price + "/month"
//                       : `$${Math.round(parseInt(PLANS[selectedPlan].price.slice(1)) * 12 * 0.8)}/year`}
//                   </span>
//                 </div>
//                 {billingCycle === "yearly" && (
//                   <div className="flex justify-between text-green-600">
//                     <span>Yearly discount (20%)</span>
//                     <span className="font-medium">
//                       -$
//                       {Math.round(
//                         parseInt(PLANS[selectedPlan].price.slice(1)) * 12 * 0.2
//                       )}
//                     </span>
//                   </div>
//                 )}
//                 <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
//                   <span>Total</span>
//                   <span>
//                     {billingCycle === "monthly"
//                       ? PLANS[selectedPlan].price
//                       : `$${Math.round(parseInt(PLANS[selectedPlan].price.slice(1)) * 12 * 0.8)}`}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700 flex items-center">
//                   <svg
//                     className="w-5 h-5 mr-2"
//                     fill="currentColor"
//                     viewBox="0 0 20 20"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                   {error}
//                 </p>
//               </div>
//             )}

//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={!stripe || loading}
//               className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//             >
//               {loading ? (
//                 <span className="flex items-center justify-center">
//                   <svg
//                     className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     ></circle>
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                     ></path>
//                   </svg>
//                   Processing...
//                 </span>
//               ) : (
//                 `Start ${billingCycle === "monthly" ? "Monthly" : "Yearly"} Plan`
//               )}
//             </button>

//             {/* Security Note */}
//             <p className="mt-6 text-center text-sm text-gray-500">
//               🔒 Secure payment by Stripe. Your card details are never stored on
//               our servers.
//             </p>
//           </form>
//         </div>
//       </div>

//       {/* Trust Indicators */}
//       <div className="mt-16 pt-8 border-t border-gray-200">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
//           <div>
//             <div className="text-2xl mb-2">🔄</div>
//             <h4 className="font-medium text-gray-900">Cancel anytime</h4>
//             <p className="text-gray-600 text-sm">No long-term contracts</p>
//           </div>
//           <div>
//             <div className="text-2xl mb-2">🛡️</div>
//             <h4 className="font-medium text-gray-900">14-day trial</h4>
//             <p className="text-gray-600 text-sm">
//               Full access, no credit card required
//             </p>
//           </div>
//           <div>
//             <div className="text-2xl mb-2">👨‍💻</div>
//             <h4 className="font-medium text-gray-900">Priority support</h4>
//             <p className="text-gray-600 text-sm">Email & chat support</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Main page wrapper with Stripe Elements provider
// export default function SubscribePage() {
//   return (
//     <Elements stripe={stripePromise}>
//       <CheckoutForm />
//     </Elements>
//   );
// }

// app/subscribe/page.tsx - UPDATED FOR SPECIFIC PACKAGES
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { useUser } from "@clerk/nextjs";
// import {
//   Elements,
//   CardElement,
//   useStripe,
//   useElements
// } from "@stripe/react-stripe-js";
// import { loadStripe } from "@stripe/stripe-js";
// import {
//   Cpu,
//   Briefcase,
//   TrendingUp,
//   Sun,
//   Users,
//   Mic,
//   FileText,
//   Check,
//   Zap,
//   Calendar,
//   Clock
// } from "lucide-react";

// // Initialize Stripe
// const stripePromise = loadStripe(
//   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
// );

// // Define packages from the document
// const PACKAGES = {
//   sandbox: {
//     id: "sandbox",
//     name: "SandBox Level",
//     description: "Professional sandbox for AI development",
//     priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SANDBOX_MONTHLY!,
//     monthlyPrice: 500,
//     maxGpts: 12,
//     duration: "Monthly",
//     gptIds: Array(12)
//       .fill("")
//       .map((_, i) => `gpu-${i + 1}`),
//     aiCredits: 50000,
//     features: [
//       "12 GPUs access",
//       "50,000 AI credits/month",
//       "Priority support",
//       "Custom agent training",
//       "API access",
//       "Unlimited projects",
//       "Advanced analytics",
//       "Team collaboration (up to 10 users)"
//     ],
//     icon: <Cpu className="w-5 h-5" />,
//     color: "purple",
//     badge: "Professional",
//     isPaid: true
//   },
//   clientProject: {
//     id: "clientProject",
//     name: "Client Project GPTs",
//     description: "Individual GPT for client projects",
//     priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CLIENT_PROJECT_MONTHLY!,
//     monthlyPrice: 49, // Assuming price after trial
//     maxGpts: 1,
//     duration: "30-day trial",
//     gptIds: ["client-project"],
//     aiCredits: 1000,
//     features: [
//       "1 GPT for client projects",
//       "1,000 AI credits",
//       "30-day free trial",
//       "Converts to paid after trial",
//       "Email support",
//       "Basic templates",
//       "Project management tools"
//     ],
//     icon: <Briefcase className="w-5 h-5" />,
//     color: "blue",
//     badge: "Trial",
//     isPaid: true,
//     hasTrial: true
//   },
//   analyzingTrends: {
//     id: "analyzingTrends",
//     name: "Analyzing Trends SandBox",
//     description: "Educational access for trend analysis",
//     maxGpts: 4,
//     duration: "5-month semester",
//     gptIds: [
//       "trend-analysis-1",
//       "trend-analysis-2",
//       "trend-analysis-3",
//       "trend-analysis-4"
//     ],
//     aiCredits: 5000,
//     features: [
//       "4 GPUs for trend analysis",
//       "5,000 AI credits total",
//       "Free for 5 months",
//       "Academic use only",
//       "Research tools",
//       "Data visualization",
//       "Export capabilities"
//     ],
//     icon: <TrendingUp className="w-5 h-5" />,
//     color: "green",
//     badge: "Free",
//     isPaid: false,
//     isEducational: true
//   },
//   summer: {
//     id: "summer",
//     name: "Summer SandBox",
//     description: "Summer program access",
//     maxGpts: 3,
//     duration: "3-month semester",
//     gptIds: ["summer-project-1", "summer-project-2", "summer-project-3"],
//     aiCredits: 3000,
//     features: [
//       "3 GPUs for summer projects",
//       "3,000 AI credits total",
//       "Free for 3 months",
//       "Summer program access",
//       "Project templates",
//       "Mentor support",
//       "Portfolio building"
//     ],
//     icon: <Sun className="w-5 h-5" />,
//     color: "yellow",
//     badge: "Free",
//     isPaid: false,
//     isEducational: true
//   },
//   workshop: {
//     id: "workshop",
//     name: "Workshop GPTs",
//     description: "Workshop and training access",
//     maxGpts: 4,
//     duration: "33 days (3 + 30)",
//     gptIds: ["workshop-1", "workshop-2", "workshop-3", "workshop-4"],
//     aiCredits: 2000,
//     features: [
//       "4 GPUs for workshops",
//       "2,000 AI credits total",
//       "Free for 33 days",
//       "Workshop materials",
//       "Hands-on training",
//       "Certificate of completion",
//       "Community access"
//     ],
//     icon: <Users className="w-5 h-5" />,
//     color: "orange",
//     badge: "Free",
//     isPaid: false,
//     isTemporary: true
//   },
//   classroomSpeaker: {
//     id: "classroomSpeaker",
//     name: "Classroom Speaker GPT",
//     description: "Educational speaker access",
//     maxGpts: 1,
//     duration: "15 days (1 + 14)",
//     gptIds: ["classroom-speaker"],
//     aiCredits: 500,
//     features: [
//       "1 GPT for classroom use",
//       "500 AI credits total",
//       "Free for 15 days",
//       "Educational content",
//       "Presentation tools",
//       "Q&A capabilities",
//       "Student engagement"
//     ],
//     icon: <Mic className="w-5 h-5" />,
//     color: "red",
//     badge: "Free",
//     isPaid: false,
//     isEducational: true
//   },
//   substack: {
//     id: "substack",
//     name: "Substack GPT",
//     description: "Content creation assistant",
//     maxGpts: 1,
//     duration: "14 days",
//     gptIds: ["substack-writer"],
//     aiCredits: 500,
//     features: [
//       "1 GPT for Substack writing",
//       "500 AI credits total",
//       "Free for 14 days",
//       "Content generation",
//       "SEO optimization",
//       "Newsletter templates",
//       "Audience analytics"
//     ],
//     icon: <FileText className="w-5 h-5" />,
//     color: "pink",
//     badge: "Free",
//     isPaid: false,
//     isTemporary: true
//   }
// };

// // Helper function to get color classes
// const getColorClasses = (color: string) => {
//   const colorMap: Record<string, string> = {
//     purple: "border-purple-500 bg-purple-50 text-purple-800",
//     blue: "border-blue-500 bg-blue-50 text-blue-800",
//     green: "border-green-500 bg-green-50 text-green-800",
//     yellow: "border-yellow-500 bg-yellow-50 text-yellow-800",
//     orange: "border-orange-500 bg-orange-50 text-orange-800",
//     red: "border-red-500 bg-red-50 text-red-800",
//     pink: "border-pink-500 bg-pink-50 text-pink-800"
//   };
//   return colorMap[color] || colorMap.blue;
// };

// // Main form component
// function CheckoutForm() {
//   const stripe = useStripe();
//   const elements = useElements();
//   const { user } = useUser();
//   const router = useRouter();

//   const [selectedPackage, setSelectedPackage] =
//     useState<keyof typeof PACKAGES>("clientProject");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string>("");
//   const [success, setSuccess] = useState(false);
//   const [activatingFree, setActivatingFree] = useState(false);

//   const currentPackage = PACKAGES[selectedPackage];

//   const handlePaidSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!stripe || !elements || !user) return;

//     setLoading(true);
//     setError("");

//     try {
//       // 1. Get card element
//       const cardElement = elements.getElement(CardElement);
//       if (!cardElement) throw new Error("Card element not found");

//       // 2. Create payment method
//       const { error: stripeError, paymentMethod } =
//         await stripe.createPaymentMethod({
//           type: "card",
//           card: cardElement,
//           billing_details: {
//             email: user.primaryEmailAddress?.emailAddress,
//             name: user.fullName || "AI Sandbox User"
//           }
//         });

//       if (stripeError)
//         throw new Error(stripeError.message || "Card validation failed");

//       // 3. Call your Convex backend to create subscription
//       const response = await fetch("/api/create-subscription", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           clerkUserId: user.id,
//           stripePaymentMethodId: paymentMethod.id,
//           priceId: currentPackage.priceId!,
//           email: user.primaryEmailAddress?.emailAddress
//         })
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Subscription creation failed");
//       }

//       // 4. Handle 3D Secure if required
//       if (result.requiresAction) {
//         const { error: confirmError } = await stripe.confirmCardPayment(
//           result.clientSecret
//         );

//         if (confirmError) throw new Error(confirmError.message);
//       }

//       // 5. Success!
//       setSuccess(true);
//       setTimeout(() => {
//         router.push("/dashboard?welcome=true");
//       }, 2000);
//     } catch (err: any) {
//       console.error("Subscription error:", err);
//       setError(err.message || "Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFreeActivation = async () => {
//     if (!user) return;

//     setActivatingFree(true);
//     setError("");

//     try {
//       // Call your Convex mutation for free package activation
//       const response = await fetch("/api/activate-free-package", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           clerkUserId: user.id,
//           packageId: selectedPackage,
//           duration: currentPackage.duration,
//           maxGpts: currentPackage.maxGpts,
//           gptIds: currentPackage.gptIds,
//           aiCredits: currentPackage.aiCredits
//         })
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Failed to activate free package");
//       }

//       setSuccess(true);
//       setTimeout(() => {
//         router.push("/dashboard?welcome=true");
//       }, 2000);
//     } catch (err: any) {
//       console.error("Free package activation error:", err);
//       setError(err.message || "Something went wrong. Please try again.");
//     } finally {
//       setActivatingFree(false);
//     }
//   };

//   if (success) {
//     return (
//       <div className="max-w-md mx-auto mt-20 text-center">
//         <div className="animate-pulse">
//           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
//             <svg
//               className="w-8 h-8 text-green-600"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M5 13l4 4L19 7"
//               />
//             </svg>
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 mb-3">
//             {currentPackage.isPaid
//               ? "Subscription Activated!"
//               : "Free Package Activated!"}{" "}
//             🎉
//           </h2>
//           <p className="text-gray-600">
//             Welcome to {currentPackage.name}! Redirecting to your dashboard...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-12">
//       <div className="text-center mb-12">
//         <h1 className="text-4xl font-bold text-gray-900 mb-4">
//           Choose Your AI Sandbox Plan
//         </h1>
//         <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//           Select from our range of professional and educational packages
//         </p>
//       </div>

//       <div className="grid lg:grid-cols-3 gap-8 mb-12">
//         {/* Professional Packages */}
//         <div className="lg:col-span-2">
//           <h2 className="text-2xl font-bold text-gray-900 mb-6">
//             Professional Packages
//           </h2>
//           <div className="grid md:grid-cols-2 gap-6">
//             {(["sandbox", "clientProject"] as const).map((pkgId) => {
//               const pkg = PACKAGES[pkgId];
//               return (
//                 <div
//                   key={pkgId}
//                   onClick={() => setSelectedPackage(pkgId)}
//                   className={`border-2 rounded-xl p-6 cursor-pointer transition-all h-full flex flex-col ${
//                     selectedPackage === pkgId
//                       ? "border-blue-500 bg-blue-50"
//                       : "border-gray-200 hover:border-gray-300"
//                   }`}
//                 >
//                   <div className="flex justify-between items-start mb-4">
//                     <div className="flex items-center gap-3">
//                       <div
//                         className={`p-2 rounded-lg ${getColorClasses(pkg.color).split(" ")[1]}`}
//                       >
//                         {pkg.icon}
//                       </div>
//                       <div>
//                         <h3 className="text-xl font-bold text-gray-900">
//                           {pkg.name}
//                         </h3>
//                         <span
//                           className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(pkg.color)}`}
//                         >
//                           {pkg.badge}
//                         </span>
//                       </div>
//                     </div>
//                     {selectedPackage === pkgId && (
//                       <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
//                         Selected
//                       </div>
//                     )}
//                   </div>

//                   <p className="text-gray-600 mb-4 flex-grow">
//                     {pkg.description}
//                   </p>

//                   <div className="mb-4">
//                     <div className="flex items-center gap-2 mb-2">
//                       <Zap className="w-4 h-4 text-gray-500" />
//                       <span className="font-medium">{pkg.maxGpts} GPUs</span>
//                     </div>
//                     <div className="flex items-center gap-2 mb-2">
//                       <Calendar className="w-4 h-4 text-gray-500" />
//                       <span className="font-medium">{pkg.duration}</span>
//                     </div>
//                     {pkg.isPaid && (
//                       <div className="text-3xl font-bold text-gray-900">
//                         ${pkg.monthlyPrice}
//                         <span className="text-lg text-gray-600 ml-1">
//                           /month
//                         </span>
//                       </div>
//                     )}
//                   </div>

//                   <ul className="space-y-2 mb-6">
//                     {pkg.features.slice(0, 4).map((feature, idx) => (
//                       <li key={idx} className="flex items-start text-sm">
//                         <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
//                         <span>{feature}</span>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Free Packages Sidebar */}
//         <div>
//           <h2 className="text-2xl font-bold text-gray-900 mb-6">
//             Free Packages
//           </h2>
//           <div className="space-y-6">
//             {(
//               [
//                 "analyzingTrends",
//                 "summer",
//                 "workshop",
//                 "classroomSpeaker",
//                 "substack"
//               ] as const
//             ).map((pkgId) => {
//               const pkg = PACKAGES[pkgId];
//               return (
//                 <div
//                   key={pkgId}
//                   onClick={() => setSelectedPackage(pkgId)}
//                   className={`border rounded-lg p-4 cursor-pointer transition-all ${
//                     selectedPackage === pkgId
//                       ? "border-blue-500 bg-blue-50"
//                       : "border-gray-200 hover:border-gray-300"
//                   }`}
//                 >
//                   <div className="flex justify-between items-start mb-2">
//                     <div className="flex items-center gap-2">
//                       <div
//                         className={`p-1 rounded ${getColorClasses(pkg.color).split(" ")[1]}`}
//                       >
//                         {pkg.icon}
//                       </div>
//                       <h3 className="font-medium text-gray-900">{pkg.name}</h3>
//                     </div>
//                     <span
//                       className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(pkg.color)}`}
//                     >
//                       Free
//                     </span>
//                   </div>
//                   <p className="text-sm text-gray-600 mb-2">
//                     {pkg.description}
//                   </p>
//                   <div className="flex items-center justify-between text-sm">
//                     <div className="flex items-center gap-2">
//                       <Zap className="w-3 h-3 text-gray-500" />
//                       <span>{pkg.maxGpts} GPUs</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Clock className="w-3 h-3 text-gray-500" />
//                       <span>{pkg.duration}</span>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>

//       {/* Payment/Activation Section */}
//       <div className="bg-white border border-gray-200 rounded-xl p-8">
//         <h2 className="text-2xl font-bold text-gray-900 mb-2">
//           {currentPackage.isPaid ? "Payment Details" : "Package Details"}
//         </h2>
//         <p className="text-gray-600 mb-8">
//           {currentPackage.isPaid
//             ? `Enter your card information to start your ${currentPackage.name} plan`
//             : `Activate your free ${currentPackage.name} package`}
//         </p>

//         {currentPackage.isPaid ? (
//           <form onSubmit={handlePaidSubmit}>
//             {/* Card Element */}
//             <div className="mb-8">
//               <label className="block text-sm font-medium text-gray-700 mb-3">
//                 Credit or debit card
//               </label>
//               <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
//                 <CardElement
//                   options={{
//                     style: {
//                       base: {
//                         fontSize: "16px",
//                         color: "#424770",
//                         "::placeholder": {
//                           color: "#aab7c4"
//                         },
//                         iconColor: "#667eea"
//                       },
//                       invalid: {
//                         color: "#9e2146"
//                       }
//                     },
//                     hidePostalCode: true
//                   }}
//                 />
//               </div>

//               {/* Test Card Info */}
//               <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                 <p className="text-sm font-medium text-yellow-800 mb-2">
//                   🧪 Testing Card Numbers
//                 </p>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <code className="bg-gray-100 px-2 py-1 rounded">
//                       4242 4242 4242 4242
//                     </code>
//                     <p className="text-gray-600 text-xs mt-1">Visa (success)</p>
//                   </div>
//                   <div>
//                     <code className="bg-gray-100 px-2 py-1 rounded">
//                       4000 0000 0000 3220
//                     </code>
//                     <p className="text-gray-600 text-xs mt-1">3D Secure</p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Order Summary */}
//             <div className="border-t border-gray-200 pt-6 mb-8">
//               <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
//               <div className="space-y-3">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">{currentPackage.name}</span>
//                   <span className="font-medium">
//                     ${currentPackage.monthlyPrice}/month
//                   </span>
//                 </div>
//                 {currentPackage.hasTrial && (
//                   <div className="flex justify-between text-green-600">
//                     <span>30-day free trial</span>
//                     <span className="font-medium">$0 first month</span>
//                   </div>
//                 )}
//                 <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
//                   <span>Total</span>
//                   <span>
//                     {currentPackage.hasTrial
//                       ? "$0 first month"
//                       : `$${currentPackage.monthlyPrice}/month`}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700">{error}</p>
//               </div>
//             )}

//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={!stripe || loading}
//               className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//             >
//               {loading ? (
//                 <span className="flex items-center justify-center">
//                   <svg
//                     className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     ></circle>
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                     ></path>
//                   </svg>
//                   Processing...
//                 </span>
//               ) : currentPackage.hasTrial ? (
//                 "Start 30-Day Free Trial"
//               ) : (
//                 "Subscribe Now"
//               )}
//             </button>
//           </form>
//         ) : (
//           <div>
//             {/* Package Details */}
//             <div className="mb-8 p-6 bg-gray-50 rounded-lg">
//               <div className="grid grid-cols-2 gap-4 mb-6">
//                 <div className="space-y-2">
//                   <div className="flex items-center gap-2">
//                     <Zap className="w-4 h-4 text-gray-500" />
//                     <span className="font-medium">GPUs:</span>
//                     <span>{currentPackage.maxGpts}</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Calendar className="w-4 h-4 text-gray-500" />
//                     <span className="font-medium">Duration:</span>
//                     <span>{currentPackage.duration}</span>
//                   </div>
//                 </div>
//                 <div className="space-y-2">
//                   <div className="flex items-center gap-2">
//                     <Cpu className="w-4 h-4 text-gray-500" />
//                     <span className="font-medium">AI Credits:</span>
//                     <span>{currentPackage.aiCredits.toLocaleString()}</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Check className="w-4 h-4 text-gray-500" />
//                     <span className="font-medium">Price:</span>
//                     <span className="text-green-600 font-bold">FREE</span>
//                   </div>
//                 </div>
//               </div>

//               <h4 className="font-medium text-gray-900 mb-3">Features:</h4>
//               <ul className="space-y-2">
//                 {currentPackage.features.map((feature, idx) => (
//                   <li key={idx} className="flex items-start text-sm">
//                     <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
//                     <span>{feature}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-red-700">{error}</p>
//               </div>
//             )}

//             {/* Activate Button */}
//             <button
//               onClick={handleFreeActivation}
//               disabled={activatingFree}
//               className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//             >
//               {activatingFree ? (
//                 <span className="flex items-center justify-center">
//                   <svg
//                     className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     ></circle>
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                     ></path>
//                   </svg>
//                   Activating...
//                 </span>
//               ) : (
//                 `Activate ${currentPackage.name}`
//               )}
//             </button>
//           </div>
//         )}

//         {/* Security Note */}
//         <p className="mt-6 text-center text-sm text-gray-500">
//           🔒 Secure payment by Stripe. Your card details are never stored on our
//           servers.
//         </p>
//       </div>

//       {/* Trust Indicators */}
//       <div className="mt-16 pt-8 border-t border-gray-200">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
//           <div>
//             <div className="text-2xl mb-2">🔄</div>
//             <h4 className="font-medium text-gray-900">No hidden fees</h4>
//             <p className="text-gray-600 text-sm">Transparent pricing</p>
//           </div>
//           <div>
//             <div className="text-2xl mb-2">🛡️</div>
//             <h4 className="font-medium text-gray-900">Cancel anytime</h4>
//             <p className="text-gray-600 text-sm">
//               Full control over your subscription
//             </p>
//           </div>
//           <div>
//             <div className="text-2xl mb-2">👨‍💻</div>
//             <h4 className="font-medium text-gray-900">24/7 support</h4>
//             <p className="text-gray-600 text-sm">Email & chat support</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Main page wrapper
// export default function SubscribePage() {
//   return (
//     <Elements stripe={stripePromise}>
//       <CheckoutForm />
//     </Elements>
//   );
// }
// // import { useState } from "react";

import StripeProviderWrapper from "@/components/subscribe/StripeProviderWrapper";
import CheckoutForm from "@/components/subscribe/CheckoutForm";

export default function SubscribePage() {
  return (
    <StripeProviderWrapper>
      <CheckoutForm />
    </StripeProviderWrapper>
  );
}
