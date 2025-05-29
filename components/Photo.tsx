"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const Photo = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { delay: 4, duration: 0.4, ease: "easeIn" }
        }}>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{
            opacity: 1,
            transition: { delay: 4, duration: 0.4, ease: "easeIn" },
            x: 0
          }}
          className="absolute top-0 right-28 z-5">
          <Image
            src="/rectangle-right.png"
            width={882}
            height={600}
            priority
            quality={100}
            alt="Background Image"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{
            opacity: 1,
            transition: { delay: 4, duration: 0.4, ease: "easeIn" },
            x: 0
          }}
          className="absolute -top-12 right-40 z-6">
          <Image
            src="/players.png"
            width={830}
            height={689.68}
            priority
            quality={100}
            alt="Players Image"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Photo