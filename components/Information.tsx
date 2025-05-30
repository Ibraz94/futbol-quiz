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
    <section ref={ref} className="relative min-h-[80vh] flex flex-col justify-center py-8 sm:py-12 xl:py-0 overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] lg:w-[184px] lg:h-[184px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[100px] sm:blur-[120px] lg:blur-[150px] absolute top-20 sm:top-36 right-10 sm:right-32 lg:right-96"></div>
      <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] lg:w-[180px] lg:h-[180px] rounded-full bg-gradient-to-r from-[#3707FC] to-[#a442c5] blur-[100px] sm:blur-[120px] lg:blur-[150px] absolute top-[300px] sm:top-[400px] lg:top-[450px] left-10 sm:left-32 lg:left-80"></div>
      
      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={headingVariants}
        className="text-center mb-8 sm:mb-12"
      >
        <h2 className="text-sm sm:text-base font-normal text-accent uppercase mb-2 sm:mb-4">Information</h2>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[50px] font-semibold mb-4 sm:mb-6 leading-tight">Why Us Play Matchup</h1>
        <p className="font-light text-sm sm:text-base max-w-4xl mx-auto leading-relaxed px-4">
          At Hazard, we provide thousands of players with the best gambling activities and discreet gaming<br className="hidden sm:block" /> experience of online casinos while creating a safe place to play.
        </p>
      </motion.div>

      <motion.div 
        className="container mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {information.map((info, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col items-center justify-center w-full max-w-[410px] mx-auto h-auto min-h-[280px] sm:min-h-[320px] lg:h-[350px] bg-[#2F265380] rounded-[15px] sm:rounded-[20px] border-2 border-white/10 hover:border-accent transition-all duration-300 ease-in-out p-6 sm:p-8 group"
            >
              <div className="flex flex-col items-center sm:items-start justify-center text-center sm:text-left w-full">
                <div className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] lg:w-[80px] lg:h-[80px] rounded-full flex items-center justify-center bg-accent group-hover:bg-transparent border-2 border-transparent group-hover:border-accent transition-all duration-300 ease-in-out mb-4 sm:mb-6">
                  <div className="scale-75 sm:scale-90 lg:scale-100">
                    {info.icon}
                  </div>
                </div>
                <div className="text-lg sm:text-xl lg:text-[24px] font-medium mb-3 sm:mb-4">
                  {info.title}
                </div>
                <div className="text-sm sm:text-base lg:text-lg font-light leading-relaxed max-w-[310px]">
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