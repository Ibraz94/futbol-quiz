'use client'

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";


const HeroSection = () => {
    const router = useRouter();
    return (
        <section className="relative h-dvh overflow-hidden bg-gradient-to-b from-[#111827] to-black hidden md:block">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="h-full w-full mix-blend-overlay absolute top-16 left-0 hidden md:block"
            >
                <Image src="/dust.png" alt="dust" fill className="object-cover" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="h-full absolute mix-blend-plus-lighter top-[350px] left-0 w-full hidden md:block"
            >
                <Image src="/smoke.png" alt="smoke" fill className="object-cover" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="w-[1198px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 mix-blend-plus-overlay hidden md:block"
            >
                <Image src="/Hero.png" alt="hero-image" fill className="object-cover" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-680px", y: "00px" }}
                animate={{ opacity: 1, x: "-750px", y: "00px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/box-1.png" alt="box-1" width={25} height={10} className="absolute top-10 right-1 md:top-10 md:right-1" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-450px", y: "500px" }}
                animate={{ opacity: 1, x: "-700px", y: "00px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-0 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/Box-2.png" alt="box-2" width={22} height={10} className="absolute top-0 left-52 md:top-32 md:left-44" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-600px", y: "100px" }}
                animate={{ opacity: 1, x: "-700px", y: "00px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/Box-2.png" alt="box-2" width={22} height={10} className="absolute bottom-14 left-1/2 md:-bottom-14 md:left-1/2" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-660px", y: "00px" }}
                animate={{ opacity: 1, x: "-780px", y: "-40px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/circle.png" alt="circle" width={50} height={50} className="absolute -bottom-14 -right-28 md:-bottom-14 md:-right-28" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-900px", y: "00px" }}
                animate={{ opacity: 1, x: "-780px", y: "00px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/circle.png" alt="circle" width={50} height={50} className="absolute top-6 right-[400px] opacity-30 md:top-6 md:right-[400px]" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: "-790px", y: "00px" }}
                animate={{ opacity: 1, x: "-690px", y: "00px" }}
                transition={{ duration: 1, delay: 2, ease: "easeIn" }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 md:block"
            >
                <Image src="/circle-2.png" alt="circle-2" width={180} height={100} className="absolute top-32 -left-36 md:top-32 md:-left-36" />
            </motion.div>

            {/* Keep the large images hidden on mobile */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 hidden md:block"
            >
                <Image src="/player-left.png" alt="player-left" width={650} height={100} className="absolute top-24 -left-72" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="w-[1400px] h-[700px] absolute top-18 left-1/2 -translate-x-1/2 hidden md:block"
            >
                <Image src="/player-right.png" alt="player-right" width={600} height={100} className="absolute top-24 -right-44 rotate-12" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="w-[600px] h-[600px] absolute top-18 left-1/2 -translate-x-1/2 hidden md:block"
            >
                <Image src="/football.png" alt="football" width={266} height={266} className="absolute -bottom-48 -left-[400px]" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="relative flex flex-col items-center justify-center h-full space-y-[-20px] z-10 bottom-12 md:bottom-24 px-4 md:px-0"
            >
                <h1 className="text-4xl md:text-6xl font-medium text-center">Daily Quiz, Daily Bonus</h1>
                <h1 className="text-[50px] md:text-[90px] font-medium text-center">Play Today!</h1>
                <div className="flex flex-col items-center justify-center pt-2">
                    <p className="text-lg md:text-xl font-light text-center max-w-[600px]">Lorem ipsum dolor sit amet, consectetuer adipiscing elit.<br className="hidden md:block" /> Aenean commodo ligula eget dolor.</p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mt-6 md:mt-8">
                        <Button variant="outline" className="w-[160px] ">START QUIZ</Button>
                        <Button variant="outline" className="w-[160px] " onClick={() => router.push("/bingogame")}>JOIN LIVE GAME</Button>
                    </div>
                </div>
            </motion.div>
        </section>

    )
}

export default HeroSection;