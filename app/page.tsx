import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { title } from "process";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/50 flex items-center justify-center relative">
      {/* Background Grid */}
      <section className="w-full px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 flex flex-col items-center space-y-10 text-center">
        <header className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
            AI Agent assistant
          </h1>
          <p className="max-w-[600px] text-lg text-gray-600 md:text-xl/relaxed xl:text-2xl/relaxed">
            Meet your new AI chat companion that goes beyond conversation - it
            can actually get things done
            <br />
            <span className="text-gray-400 text-sm">
              powered by IBM wxflows tool
            </span>
          </p>
        </header>
        <Button variant="outline">Button</Button>
        <SignedIn>
          <Link href="/dashboard">
            <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:translate-y-0.5">
              Get started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <div className="absolute inset-0 z-10 bg-[linear-gradient(to-right,#e5e5e5_1px,transparent_1px),linear-gradient(to-bottom,#e5e5e5_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
            </button>
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton
            mode="modal"
            fallbackRedirectUrl={"/dashboard"}
            forceRedirectUrl={"/dashboard"}
          >
            <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:translate-y-0.5">
              Sign up
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <div className="absolute inset-0 z-10 bg-[linear-gradient(to-right,#e5e5e5_1px,transparent_1px),linear-gradient(to-bottom,#e5e5e5_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
            </button>
          </SignInButton>
        </SignedOut>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 pt-8 max-w-3xl mx-auto">
          {[
            {
              title: "Fast",
              description: " Real time streamed response"
            },
            {
              title: "Modern",
              description: "NextJS 15, Tailwind CSS, Convex, Clerk"
            },
            {
              title: "Smart",
              description: "Powered by your favorite LLM"
            }
          ].map(({ title, description }) => (
            <div key={title} className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {title}
              </div>
              <div className="text-small  text-gray-600">{description}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
