"use client";
import { motion } from "framer-motion";
import Image from "next/image";


const Photo = () => {
  return (
    <div className="w-full h-full">
        <motion.div initial={{opacity: 0}} 
        animate={{
            opacity: 1, 
            transition: {delay: 2, duration: 0.4, ease: "easeIn"}}}>

            <motion.div 
               initial={{opacity: 0}} 
               animate={{
                   opacity: 1, 
                   transition: {delay: 2.4, duration: 0.4, ease: "easeInOut"}}}
                   className="w-[280px] h-[280px] xl:w-[475px] xl:h-[480px] mix-blend-lighten absolute">
                   <Image
                   src="/img.png"
                   fill
                   priority
                   quality={100} 
                   alt="Portfolio Image"
                   className="object-contain"
                   />
            </motion.div>

            <motion.svg 
                    className="w-[305px] h-[305px] xl:w-[505px] xl:h-[505px]"
                    fill="transparent"
                    viewBox="0 0 503 503"
                    xmlns="https://www.w3.org/2000/svg"
                         >
            </motion.svg>
        </motion.div>
    </div>
  )
}

export default Photo