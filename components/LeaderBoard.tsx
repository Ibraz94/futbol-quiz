"use client"

import { useRef } from 'react';
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
  // const [_isLeaderboard, _setIsLeaderboard] = useState(leaderboard[0]);

  // const handleSlideChange = (swiper: any) => {
  //   const currentIndex = swiper.activeIndex;
  //   setIsLeaderboard(leaderboard[currentIndex])
  // }

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
    <section className="flex flex-col items-center justify-center py-8 lg:py-12 xl:py-2 relative px-4 sm:px-6 lg:px-8">
      {/* Static Background Elements - Hidden on mobile */}
      <div className="absolute inset-0 hidden lg:block">
        <Image src="/circle-2.png" alt="circle-2" width={160} height={100} className="absolute bottom-36 -left-16" />
        <Image src="/Box-2.png" alt="box-2" width={22} height={10} className="absolute bottom-72 left-32" />
      </div>

      {/* Animated Content */}
      <div ref={ref} className="relative z-10 w-full max-w-7xl">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headingVariants}
          className="text-center mb-8 lg:mb-12"
        >
          <h2 className="text-sm sm:text-base font-normal text-accent uppercase mb-2">leaderboard</h2>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[50px] font-semibold mb-4">Quiz Games Leaderboard</h1>
          <p className="text-sm sm:text-base font-light max-w-4xl mx-auto leading-relaxed">
            Check out our top players who have mastered the casino-style games and claimed their spot at the top!
            <br className="hidden sm:block" /> 
            Compete with others to see if you can climb the ranks and become the ultimate champion.
          </p>
        </motion.div>

        <motion.div 
          className="w-full bg-[#2F265380] rounded-lg lg:rounded-[20px] border border-white/10 overflow-hidden"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={tableVariants}
        >
          {/* Header - Desktop */}
          <div className='bg-[#3707FC] rounded-t-lg lg:rounded-t-[20px] z-10 hidden md:block'>
            <div className='text-lg lg:text-xl xl:text-2xl font-medium uppercase flex items-center justify-between px-4 lg:px-8 xl:px-16 py-4 lg:py-6'>
              <div className="flex-1 text-left">username</div>
              <div className="flex-1 text-center">Games</div>
              <div className="flex-1 text-center">Now Playing</div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[400px] sm:max-h-[500px] lg:max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple scrollbar-track-dark">
            {leaderboard.map((item, index) => (
              <motion.div 
                key={index} 
                className='px-2 sm:px-4 lg:px-8 py-1 lg:py-2'
                custom={index}
                variants={itemVariants}
              >
                {/* Desktop Layout */}
                <div className='bg-[#000616] rounded-lg lg:rounded-[12.48px] hidden md:block'>
                  <div className='flex items-center justify-between px-4 lg:px-8 py-3 lg:py-4 h-full min-h-[70px] lg:min-h-[90px]'>
                    <div className='flex items-center justify-start gap-2 lg:gap-4 flex-1'>
                      <div className='flex items-center justify-center text-lg lg:text-2xl xl:text-[32px] font-medium'>
                        {item.position}
                        <span className='text-xs font-light'>TH</span>
                      </div>
                      <div className='flex items-center justify-center gap-2 text-sm lg:text-lg font-normal'>
                        <Image src={item.image} alt={item.name} width={32} height={32} className="lg:w-10 lg:h-10" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    </div>
                    <div className='flex items-center justify-center text-sm lg:text-lg font-normal flex-1'>
                      <span className="text-center">{item.games}</span>
                    </div>
                    <div className='flex items-center justify-center flex-1'>
                      <button className='text-sm lg:text-lg font-normal bg-[#1C273D] rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 hover:bg-[#2A3749] transition-colors'>
                        {item.nowPlaying}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className='bg-[#000616] rounded-lg p-4 md:hidden'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center justify-center text-xl font-medium'>
                        {item.position}
                        <span className='text-xs font-light'>TH</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Image src={item.image} alt={item.name} width={32} height={32} />
                        <span className="text-sm font-normal">{item.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-gray-300'>
                      <span className="font-medium">Game: </span>{item.games}
                    </div>
                    <button className='text-sm font-normal bg-[#1C273D] rounded-lg px-3 py-1.5 hover:bg-[#2A3749] transition-colors'>
                      {item.nowPlaying}
                    </button>
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