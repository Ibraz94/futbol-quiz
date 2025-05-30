'use client'

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

const MobileHeroSection = () => {
    return (
        <section className="relative h-screen  bg-gradient-to-b from-[#111827] to-black md:hidden">
            {/* Hero Image - Full height from top */}
            <div className="absolute inset-0 w-full h-full z-0">
                <Image 
                    src="/Hero.png" 
                    alt="hero-image" 
                    width={780}
                    height={780}
                    priority
                    className="object-cover object-center"

                    quality={100}
                />
            </div>

            {/* Overlay gradient for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-[1]" />

            {/* Content Section - Overlay on hero image */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
                className="relative flex flex-col items-center justify-start px-4 pt-16 z-[2]"
            >
                {/* Headings and Buttons First */}
                <div className="flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-medium text-center text-white">Daily Quiz, Daily Bonus</h1>
                    <h1 className="text-[50px] font-medium text-center text-white">Play Today!</h1>
                    <div className="flex flex-col items-center justify-center pt-2">
                        <p className="text-lg font-light text-center text-white/90">
                            Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-4 mt-6">
                            <Button variant="outline" className="w-24 hover:bg-accent text-xs">START QUIZ</Button>
                            <Button variant="outline" className="w-28 hover:bg-accent text-xs">JOIN LIVE GAME</Button>
                        </div>
                    </div>
                </div>

                {/* Players and Football - Below the content */}
                <div className="relative w-full mt-12">
                    {/* Football Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 2 }}
                        className="absolute -bottom-20 left-20 -translate-x-1/2"
                    >
                        <Image 
                            src="/football.png" 
                            alt="football" 
                            width={100} 
                            height={120} 
                            className="relative z-20"
                        />
                    </motion.div>

                    {/* Players */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 2 }}
                        className="relative w-full h-[200px]"
                    >
                        <Image 
                            src="/player-left.png" 
                            alt="player-left" 
                            width={340} 
                            height={80} 
                            className="absolute -bottom-24 -left-20" 
                        />
                        <Image 
                            src="/player-right.png" 
                            alt="player-right" 
                            width={300} 
                            height={80} 
                            className="absolute -bottom-24 -right-24 rotate-12" 
                        />
                    </motion.div>
                </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="w-full h-full absolute top-0 left-0 z-[1] pointer-events-none"
            >
                <Image 
                    src="/box-1.png" 
                    alt="box-1" 
                    width={15} 
                    height={6} 
                    className="absolute bottom-10 right-4" 
                />
                <Image 
                    src="/Box-2.png" 
                    alt="box-2" 
                    width={12} 
                    height={6} 
                    className="absolute bottom-96 left-16" 
                />
                <Image 
                    src="/circle.png" 
                    alt="circle" 
                    width={30} 
                    height={30} 
                    className="absolute bottom-[360px] right-32 opacity-40" 
                />
                <Image 
                    src="/circle-2.png" 
                    alt="circle-2" 
                    width={100} 
                    height={60} 
                    className="absolute bottom-[300px] -left-12 " 
                />
                <Image 
                    src="/circle.png" 
                    alt="circle" 
                    width={50} 
                    height={50} 
                    className="absolute bottom-20 right-32 opacity-40" 
                />
            </motion.div>
        </section>
    )
}

export default MobileHeroSection; 