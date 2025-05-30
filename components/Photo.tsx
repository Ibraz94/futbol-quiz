"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const Photo = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { delay: 2, duration: 0.4, ease: "easeIn" }
        }}>

        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{
            opacity: 1,
            transition: { delay: 2, duration: 0.4, ease: "easeIn" },
            x: 0
          }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 sm:bottom-16 md:bottom-20 md:right-8 md:left-auto md:transform-none lg:top-0 lg:bottom-auto lg:right-16 lg:left-auto lg:transform-none xl:right-28 z-5">
          <Image
            src="/rectangle-right.png"
            width={882}
            height={600}
            priority
            quality={100}
            alt="Background Image"
            className="w-auto h-auto max-w-[200px] max-h-[150px] sm:max-w-[250px] sm:max-h-[200px] md:max-w-[300px] md:max-h-[250px] lg:max-w-[500px] lg:max-h-[450px] xl:max-w-[882px] xl:max-h-[600px]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{
            opacity: 1,
            transition: { delay: 2, duration: 0.4, ease: "easeIn" },
            x: 0
          }}
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 sm:bottom-12 md:bottom-16 md:right-4 md:left-auto md:transform-none lg:-top-8 lg:bottom-auto lg:right-24 lg:left-auto lg:transform-none xl:-top-12 xl:right-40 z-6">
          <Image
            src="/players.png"
            width={830}
            height={689.68}
            priority
            quality={100}
            alt="Players Image"
            className="w-auto h-auto max-w-[180px] max-h-[200px] sm:max-w-[220px] sm:max-h-[250px] md:max-w-[280px] md:max-h-[300px] lg:max-w-[550px] lg:max-h-[600px] xl:max-w-[830px] xl:max-h-[689px]"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Photo