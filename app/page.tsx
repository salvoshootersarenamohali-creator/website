import { Hero } from "@/components/home/Hero";
import { ValueProps } from "@/components/home/ValueProps";
import { FeaturedCourses } from "@/components/home/FeaturedCourses";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { CTASection } from "@/components/home/CTASection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <ValueProps />
      <FeaturedCourses />
      <HowItWorks />
      <Testimonials />
      <CTASection />
    </div>
  );
}
