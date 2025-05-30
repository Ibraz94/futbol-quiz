"use client";

import { ArrowDownToLine, Ticket } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const information = [
  {
    title: '24*7 Withdrawals',
    description: 'Instant Cash Withdrawals Are Accessible Around The Clock For Smooth Gameplay Rewards.',
    icon: <Image src="/hand.svg" alt="hand-coins" width={45} height={45} />,
  },
  {
    title: '500k + Downloads',
    description: 'With Our Recognized Cricket Game App, You May Join Over 500,000 Other Passionate Gamers.',
    icon: <ArrowDownToLine size={45} strokeWidth={1} />
  },
  {
    title: 'Lowest Entry Fee',
    description: 'Experience Football Thrill For The Lowest Possible Admission Charge And Maximum Fun Guaranteed.',
    icon: <Ticket size={45} strokeWidth={1} />
  },
];

const Services = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.5,
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const headingVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.3,
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <section ref={ref} className="relative min-h-[80vh] flex flex-col justify-center py-12 xl:py-0 overflow-hidden">
      <div className="w-[184px] h-[184px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[150px] absolute top-36 right-96"></div>
      <div className="w-[180px] h-[180px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[150px] absolute top-[450px] left-80"></div>
      
      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={headingVariants}
      >
        <h2 className="text-center text-base font-normal text-accent uppercase">Information</h2>
        <h1 className="text-center text-[50px] font-semibold">Why Us Play Matchup</h1>
        <p className="text-center font-light text-base">At Hazard, we provide thousands of players with the best gambling activities and discreet gaming<br /> experience of online casinos while creating a safe place to play.</p>
      </motion.div>

      <motion.div 
        className="container mx-auto mt-12"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {information.map((info, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col items-center justify-center w-[410px] h-[350px] bg-[#2F265380] rounded-[20px] border-2 border-white/10"
            >
              <div className="flex flex-col items-start justify-center text-center ml-8">
                <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center bg-accent mb-4">
                  {info.icon}
                </div>
                <div className="text-[24px] font-medium mb-2">
                  {info.title}
                </div>
                <div className="text-lg font-light text-left w-[310px]">
                  {info.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default Services