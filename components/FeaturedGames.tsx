"use client"

import { motion, useInView } from 'framer-motion';
import { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import "swiper/css";
import "swiper/css/autoplay";
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const featuredGames = [
  {
    image: "/bingo.png",
    title: "Bingo Multiplayer",
    description: "Play bingo with friends",
    link: "/bingogame"
  },
  {
    image: "/guess-player.png",
    title: "Quiz Multiplayer",
    description: "Guess the football player",
    link: "/quizgame"
  },
  {
    image: "/tiktak.png",
    title: "Tic Tac Toe",
    description: "Classic tic tac toe game",
    link: "/tictactoe"
  },
];

export default function Games() {
  const [project, setProject] = useState(featuredGames[0]);
  const swiperRef = useRef<any>(null);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const handleSlideChange = (swiper: any) => {
    const currentIndex = swiper.activeIndex;
    setProject(featuredGames[currentIndex])
  }

  const handlePrevSlide = () => {
    if (swiperRef.current?.swiper) {
      swiperRef.current.swiper.slidePrev();
    }
  };

  const handleNextSlide = () => {
    if (swiperRef.current?.swiper) {
      swiperRef.current.swiper.slideNext();
    }
  };

  return (
    <div className='relative' ref={containerRef}>
      
    <motion.div 
      initial={{ opacity: 0, y: -100 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className='py-6 sm:py-8 md:py-10 lg:py-12'>
        <div className='container mx-auto flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 xl:px-0'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between w-full'>
        <motion.div 
          initial={{ opacity: 0, y: -100 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className='flex flex-col mb-6 sm:mb-8 md:mb-10 lg:mb-12 xl:w-max xl:justify-none space-y-[8px] sm:space-y-[-10px] md:space-y-[12px]'>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className='text-xs sm:text-sm md:text-base uppercase text-accent'>
            Latest Games
          </motion.h1>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[50px] font-semibold'>
            Featured Games
          </motion.h1>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -100 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-row gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10 lg:mb-10 justify-center lg:justify-end"
        >
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="border hover:bg-accent-hover hover:border-none text-white w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] md:w-[37px] md:h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handlePrevSlide}
          >
            <ArrowLeft className="w-3 sm:w-3.5 md:w-4" strokeWidth={1.5} />
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="border hover:bg-accent-hover hover:border-none text-white w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] md:w-[37px] md:h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handleNextSlide}
          >
            <ArrowRight className="w-3 sm:w-3.5 md:w-4" strokeWidth={1.5} />
          </motion.button>
        </motion.div>

      </div>
      
        <Swiper
          modules={[Autoplay]}
          slidesPerView={1}
          spaceBetween={15}
          centeredSlides={false}
          loop={false}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          className="w-full"
          onSlideChange={handleSlideChange}
          ref={swiperRef}
          breakpoints={{
            640: {
              slidesPerView: 1,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 25,
            },
            1024: {
              slidesPerView: 2,
              spaceBetween: 30,
            },
            1280: {
              slidesPerView: 3,
              spaceBetween: 30,
            },
          }}>
          {featuredGames.map((game, index) => (
            <SwiperSlide key={index} className="!flex !justify-center">
              <Link href={game.link}>
                <motion.div
                  initial={{ 
                    opacity: 0, 
                    x: index === 0 ? -100 : index === 2 ? 100 : 0,
                    y: index === 1 ? 100 : 0 
                  }}
                  animate={isInView ? { 
                    opacity: 1, 
                    x: 0,
                    y: 0
                  } : { 
                    opacity: 0, 
                    x: index === 0 ? -100 : index === 2 ? 100 : 0,
                    y: index === 1 ? 100 : 0 
                  }}
                  transition={{ 
                    duration: 0.8, 
                    delay: index * 0.2,
                    ease: "easeOut" 
                  }}
                  whileHover={{ scale: 1.05 }}
                  className='w-full max-w-[280px] h-[300px] sm:max-w-[320px] sm:h-[340px] md:max-w-[350px] md:h-[370px] lg:max-w-[380px] lg:h-[400px] xl:h-[410px] rounded-[15px] sm:rounded-[18px] md:rounded-[20px] flex flex-col justify-center items-center bg-pink-50/20 overflow-hidden mx-auto cursor-pointer group relative'
                >
                  <Image 
                    src={game.image} 
                    alt="game" 
                    width={400} 
                    height={400} 
                    className="w-full h-full object-cover rounded-[15px] sm:rounded-[18px] md:rounded-[20px]"
                  />
                  
                  {/* Overlay with game info */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-4 rounded-[15px] sm:rounded-[18px] md:rounded-[20px]">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-center">
                      {game.title}
                    </h3>
                    <p className="text-sm sm:text-base text-center text-gray-200 mb-4">
                      {game.description}
                    </p>
                    <div className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
                      Play Now
                    </div>
                  </div>
                </motion.div>
              </Link>
            </SwiperSlide>
          ))}

        </Swiper>
      </div>

    </motion.div>
    </div>
  )
}
