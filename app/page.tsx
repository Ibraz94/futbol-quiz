"use client";

import FeaturedGames from "@/components/FeaturedGames";
import HeroSection from "@/components/HeroSection";
import MobileHeroSection from "@/components/MobileHeroSection";
import Information from "@/components/Information";
import Leaderboard from "@/components/LeaderBoard";
import Experience from "@/components/Experience";
import Testimonials from "@/components/Testimonials";
import ScrollAnimation from "@/components/ScrollAnimation";

const Home = () => {
  return (
    <div className="relative bg-gradient-to-b from-[#111827] to-black" >
        <div className="">
          <MobileHeroSection />
          <HeroSection />
        </div>
        <ScrollAnimation delay={0.5}>
        <div className="">
          <FeaturedGames/>
        </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.5}>
        <div className="">
          <Information/>
        </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.5}>
        <div className="mt-12">
          <Leaderboard/>
        </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.5}>
        <div className="mt-52">
          <Experience/>
        </div>
        </ScrollAnimation>
        <ScrollAnimation delay={1}>
        <div className="mt-">
          <Testimonials/>
        </div>
        </ScrollAnimation>
        {/* <ScrollAnimation>
          <section className="h-screen flex items-center justify-center bg-gray-100">
            <h1 className="text-4xl font-bold">First Section</h1>
          </section>
        </ScrollAnimation>
        <ScrollAnimation>
          <section className="h-screen flex items-center justify-center bg-gray-200">
            <h1 className="text-4xl font-bold">Second Section</h1>
          </section>
        </ScrollAnimation>
        <ScrollAnimation>
          <section className="h-screen flex items-center justify-center bg-gray-300">
            <h1 className="text-4xl font-bold">Third Section</h1>
          </section>
        </ScrollAnimation> */}
    </div>
  );
};

export default Home;