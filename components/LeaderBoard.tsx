"use client"

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

const leaderboard = [
  {
    position: "4",
    name: "Jaffery Jackson",
    games: "Football Bingo",
    nowPlaying: "Watch Now",
    image: "/jaffery.png",
  },
  {
    position: "5",
    name: "Andy Julia",
    games: "Guess The Player",
    nowPlaying: "Watch Now",
    image: "/andy.png",
  },
  {
    position: "6",
    name: "Vanesa Kamley",
    games: "Live Trivia",
    nowPlaying: "Watch Now",
    image: "/vanesa.png",
  },
  {
    position: "7",
    name: "Williams Zoi",
    games: "Logo Match",
    nowPlaying: "Watch Now",
    image: "/williams.png",
  },
  {
    position: "8",
    name: "Adam Fisher",
    games: "Tic Tac Toe Football",
    nowPlaying: "Watch Now",
    image: "/adam.png",
  },
  {
    position: "9",
    name: "Adam Fisher",
    games: "Tic Tac Toe Football",
    nowPlaying: "Watch Now",
    image: "/adam.png",
  },
];

const Leaderboards = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [isLeaderboard, setIsLeaderboard] = useState(leaderboard[0]);

  const handleSlideChange = (swiper: any) => {
    const currentIndex = swiper.activeIndex;
    setIsLeaderboard(leaderboard[currentIndex])
  }

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

  const tableVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.5,
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.7 + (i * 0.1),
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    })
  };

  return (
    <section className="flex flex-col items-center justify-center py-12 xl:py-2 relative">
      {/* Static Background Elements */}
      <div className="absolute inset-0">
        <Image src="/circle-2.png" alt="circle-2" width={160} height={100} className="absolute bottom-36 -left-16" />
        <Image src="/box-2.png" alt="box-2" width={22} height={10} className="absolute bottom-72 left-32" />
      </div>

      {/* Animated Content */}
      <div ref={ref} className="relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headingVariants}
        >
          <h2 className="text-center text-base font-normal text-accent uppercase">leaderboard</h2>
          <h1 className="text-center text-[50px] font-semibold">Quiz Games Leaderboard</h1>
          <p className="text-center font-light text-base">Check out our top players who have mastered the casino-style games and claimed their spot at the top!<br /> Compete with others to see if you can climb the ranks and become the ultimate champion.</p>
        </motion.div>

        <motion.div 
          className="w-[1290px] bg-[#2F265380] rounded-[20px] mt-[50px] border border-white/10"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={tableVariants}
        >
          <div className='bg-[#3707FC] rounded-t-[20px] z-10'>
            <div className='text-2xl font-medium uppercase flex items-center justify-between px-16 py-6'>
              <div className="flex-1 text-left">username</div>
              <div className="flex-1 text-center">Games</div>
              <div className="flex-1 text-center">Now Playing</div>
            </div>
          </div>
          <div className="max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple scrollbar-track-dark pr-2">
            {leaderboard.map((item, index) => (
              <motion.div 
                key={index} 
                className='px-8 py-2'
                custom={index}
                variants={itemVariants}
              >
                <div className='bg-[#000616] h-[90px] rounded-[12.48px]'>
                  <div className='flex items-center justify-between px-8 py-3 h-full'>
                    <div className='flex items-center justify-start gap-4 flex-1'>
                      <div className='flex items-center justify-center text-[32px] font-medium'>
                        {item.position}
                        <span className='text-xs font-light'>TH</span>
                      </div>
                      <div className='flex items-center justify-center gap-2 text-lg font-normal'>
                        <Image src={item.image} alt={item.name} width={40} height={40} />
                        {item.name}
                      </div>
                    </div>
                    <div className='flex items-center justify-center text-lg font-normal flex-1'>
                      {item.games}
                    </div>
                    <div className='flex items-center justify-center flex-1'>
                      <button className='text-lg font-normal bg-[#1C273D] rounded-xl px-4 py-2'>
                        {item.nowPlaying}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Leaderboards