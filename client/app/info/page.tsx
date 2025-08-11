"use client";

import React, { useState } from "react";
import { Button } from "@/components/landingPage/ui/button";
import { Input } from "@/components/landingPage/ui/input";
import Waves from "@/components/waves";
import SuccessModal from "@/components/SuccessModal";
import Orb from "@/shared/components/orb";


export default function LandingPage() {
  // State for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // // State for contact form inputs
  const [contactForm, setContactForm] = useState({
    fullName: "",
    organization: "",
    email: "",
    phone: "",
  });

  // // State for contact form submission status
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  // // Form state management
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  // // Handle contact form submission
  const handleContactFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    // try {
    //   // Replace this API call
    //   await new Promise((resolve) => setTimeout(resolve, 1000));
    //   setContactForm({
      //     firstName: "",
      //     lastName: "",
      //     company: "",
      //     email: "",
      //     phone: "",
      //   });
      // setShowSuccessModal(true);
    // } catch {
    //   setStatus("error");
    // }
  };

  return (
    <>
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Background Waves */}
        <Waves
          lineColor="rgba(79, 70, 229, 0.6)"
          backgroundColor="black"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
        {/* Hero Section */}
        <section className="relative pt-20 pb-4 px-4 z-10">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="max-w-2xl mx-auto text-center">
              <h1
                className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 transition-all duration-900 text-6xl sm:text-7xl md:text-8xl animate-pulse"
                style={{
                  fontFamily: "var(--font-orbitron)",
                  letterSpacing: "0.15em",
                  textShadow:
                    "0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)",
                  filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))",
                }}
              >
                HRPR
              </h1>
              
              {/* Decorative Voice Orb - Static Version */}
              <div className="my-24 flex flex-col items-center" style={{ transform: 'scale(2)' }}>
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 transition-all duration-700">
                  {/* Main orb container */}
                  <div className="relative w-full h-full rounded-full overflow-hidden">
                    {/* WebGL Orb */}
                    <Orb 
                      hue={80} 
                      hoverIntensity={0.3}
                      rotateOnHover={false}
                      forceHoverState={true}
                    />
                    
                    {/* Speaker icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg 
                        className="w-12 h-12 sm:w-16 sm:h-16" 
                        viewBox="0 0 24 24" 
                        fill="none"
                      >
                        <defs>
                          <linearGradient id="speakerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgb(79, 70, 229)" />
                            <stop offset="50%" stopColor="rgb(147, 51, 234)" />
                            <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M11 5L6 9H2v6h4l5 4V5z" 
                          fill="url(#speakerGradient)"
                          opacity="0.8"
                        />
                        <path 
                          d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" 
                          stroke="url(#speakerGradient)" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                          opacity="0.6"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className=" text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-4xl sm:text-2xl md:text-3xl">
              Powered by{" "}
              <a
                href="https://banyanlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:text-white transition-all duration-200"
              >
                Banyan Labs
              </a>{" "}
              | a social enterprise of{" "}
              <a
                href="https://perseverenow.org"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:text-white transition-all duration-200"
              >
                Persevere
              </a>
            </p>
            <a href="#contact">
              {/* Demo button (scrolls to contact section) */}
              <Button
                className="mt-16 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-lg font-orbitron border-0 cursor-pointer"
                style={{ letterSpacing: "0.05em" }}
              >
                GET YOUR FREE DEMO
              </Button>
            </a>
            {/* HRPR explanation */}
            {/* Bullet points */}
            <ul>
              <li className="pt-20 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 sm:text-xl md:text-2xl lg:text-3xl text-center max-w-4xl">
                Bullet point explaining what HRPR is
              </li>
            </ul>
            {/* paragraphs */}
            <h1 className="pt-20 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 sm:text-xl md:text-2xl lg:text-3xl text-center max-w-4xl">
              Paragraph explaining what HRPR is/inviting people to learn more
              about HRPR Paragraph explaining what HRPR is/inviting people to
              learn more about HRPR Paragraph explaining what HRPR is/inviting
              people to learn more about HRPR Paragraph explaining what HRPR
              is/inviting people to learn more about HRPR Paragraph explaining
              what HRPR is/inviting people to learn more about HRPR
            </h1>
          </div>
        </section>
        {/* Contact section */}
        <section id="contact" className="relative py-10 px-4 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h2
                  className="font-orbitron text-3xl font-bold mb-4 text-white"
                  style={{ letterSpacing: "0.1em" }}
                >
                  GET IN{" "}
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                    TOUCH
                  </span>
                </h2>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-lg sm:text-md md:text-lg">
                  Fill out the form below and we'll get back to you within 24
                  hours.
                </p>
              </div>
              <form onSubmit={handleContactFormSubmit} className="space-y-6">
                <div className="grid gap-8 mb-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="fullName"
                      className="text-sm font-medium text-white"
                    >
                      Full Name *
                    </label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={contactForm.fullName}
                      onChange={handleChange}
                      className="required w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="organization"
                      className="text-sm font-medium text-white"
                    >
                      Organization *
                    </label>
                    <Input
                      id="organization"
                      name="organization"
                      type="text"
                      required
                      value={contactForm.organization}
                      onChange={handleChange}
                      className="required w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Company, nonprofit, or event name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-white"
                    >
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-medium text-white"
                    >
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={contactForm.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  {/* <div className="space-y-2">
                        <Label
                          htmlFor="times"
                          className="text-sm font-medium text-brand-white"
                        >
                          Preferred Times
                        </Label>
                        <Input
                          id="times"
                          name="times"
                          type="text"
                          value={contactForm.times}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 backdrop-blur-sm"
                          placeholder="Suggest times for a demo or meeting"
                        />
                      </div> */}
                </div>
              </form>
              <div className="mt-10 w-1/3 justify-self-center">
              {/* Submit button on contact form */}
                <Button
                  type="submit"
                  className="place-self-center place-items-center w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-lg font-orbitron border-0 cursor-pointer"
                  style={{ letterSpacing: "0.05em" }}
                  disabled={status === "loading"}
                  onClick={() => { setShowSuccessModal(true); }} // Temporarily simulate success on click
                >
                  {status === "loading" ? "Sending..." : "SUBMIT"}
                </Button>
              </div>
              {status === "error" && (
                <p className="text-center text-red-400 mt-4">
                  Something went wrong. Please try again.
                </p>
              )}
              <p className="text-center text-sm text-gray-400 mt-6">
                By submitting this form, you agree to our privacy policy and
                terms of service.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showSuccessModal && (
        <SuccessModal setShowSuccessModal={setShowSuccessModal} />
      )}
    </>
  );
}
