"use client";

import FeaturedGames from "@/components/FeaturedGames";
import HeroSection from "@/components/HeroSection";
import Information from "@/components/Information";
import Leaderboard from "@/components/LeaderBoard";
import Experience from "@/components/Experience";
import Testimonials from "@/components/Testimonials";


const Home = () => {
  return (
    <div className="relative bg-gradient-to-b from-[#111827] to-black" >
        <div className="">
          <HeroSection/>
        </div>
        <div className="">
          <FeaturedGames/>
        </div>
        <div className="">
          <Information/>
        </div>
        <div className="mt-12">
          <Leaderboard/>
        </div>
        <div className="mt-52">
          <Experience/>
        </div>
        <div className="mt-">
          <Testimonials/>
        </div>
    </div>
  );
};

export default Home;