'use client'

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const MobileHeroSection = () => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <section className="relative h-screen bg-gradient-to-b from-[#111827] to-black md:hidden">
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
                            <Button variant="outline" className="w-28 hover:bg-accent text-xs" onClick={() => setIsModalOpen(true)}>START QUIZ GAME</Button>
                            <Button variant="outline" className="w-28 hover:bg-accent text-xs" onClick={() => router.push("/bingogame")}>START BINGO GAME</Button>
                            <Button variant="outline" className="w-28 hover:bg-accent text-xs" onClick={() => router.push("/teamgame")}>START CAREER GAME</Button>
                            <Button variant="outline" className="w-28 hover:bg-accent text-xs" onClick={() => router.push("/tictactoe-leagues")}>START TICTACTOE GAME</Button>
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
                        className="absolute -bottom-12 left-12 -translate-x-1/2"
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
                            width={250}
                            height={80}
                            className="absolute -bottom-12 -left-16 "
                        />
                        <Image
                            src="/player-right.png"
                            alt="player-right"
                            width={230}
                            height={80}
                            className="absolute -bottom-12 -right-0 rotate-12"
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
                    className="absolute bottom-[360px] right-16 opacity-40"
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
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
                    <div className="bg-[#1f1f2ecc] text-white rounded-xl p-6 max-w-md w-[90%] text-left shadow-xl relative">
                        <h2 className="text-xl font-bold mb-4">Career Forecast</h2>

                        <ul className="space-y-2 text-sm leading-normal">
                            <li>⏱️ You have 20 seconds for each football player.</li>
                            <li className="text-green-400">✔️ Correct answer: 20 points + extra points for the remaining seconds.</li>
                            <li className="text-red-400">❌ If you make a mistake or pass, you won't get any points.</li>
                            <li className="text-orange-400">🔥 3 correct answers in a row: +50 points. If you guess all the players: +200 points.</li>
                        </ul>

                        <p className="mt-5 text-sm">Are you ready? Select the game mode below and the game will start! 🎉</p>

                        <div className="flex flex-col justify-center gap-3 mt-5">
                            <button
                                className="bg-[#5e5bff] hover:bg-[#4c49e0] transition text-white px-4 py-2 rounded-lg text-sm font-semibold"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    router.push("/quizgame");
                                }}
                            >
                                Start Quiz
                            </button>
                        </div>

                        <button
                            className="absolute top-3 right-4 text-gray-300 hover:text-white text-xl"
                            onClick={() => setIsModalOpen(false)}
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}

export default MobileHeroSection; 