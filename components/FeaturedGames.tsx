"use client"

import { motion, useInView } from 'framer-motion';
import { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import "swiper/css";
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';



const featuredGames = [
  {
    image: "/bingo.png",

  },
  {
    image: "/guess-player.png",
  },
  {

    image: "/tiktak.png",

  },
];



export default function Games() {

  const [project, setProject] = useState(featuredGames[0]);
  const swiperRef = useRef<any>(null);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  console.log(project)

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
      className='py-12'>
        <div className='container mx-auto flex flex-col justify-center items-center xl:px-0'>
      <div className='flex items-center justify-between w-full'>
        <motion.div 
          initial={{ opacity: 0, y: -100 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className='flex flex-col mb-12 xl:w-max xl:justify-none space-y-[-12px]'>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className='text-base uppercase text-accent'>
            Latest Games
          </motion.h1>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className='text-[50px] font-semibold'>
            Featured Games
          </motion.h1>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -100 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-row gap-6 mb-12"
        >
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="border hover:bg-accent-hover hover:border-none text-white w-[37px] h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handlePrevSlide}
          >
            <ArrowLeft className="w-4" strokeWidth={1.5} />
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="border hover:bg-accent-hover hover:border-none text-white w-[37px] h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handleNextSlide}
          >
            <ArrowRight className="w-4" strokeWidth={1.5} />
          </motion.button>
        </motion.div>

      </div>
      
        <Swiper
          slidesPerView={3}
          spaceBetween={30}
          centeredSlides={false}
          loop={false}
          className="w-full"
          onSlideChange={handleSlideChange}
          ref={swiperRef}>
          {featuredGames.map((game, index) => (
            <SwiperSlide key={index} className="!flex !justify-center">
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
                className='w-[380px] h-[410px] rounded-[20px] flex justify-center items-center bg-pink-50/20 overflow-hidden'
              >
                <Image 
                  src={game.image} 
                  alt="game" 
                  width={400} 
                  height={400} 
                  className="w-full h-full object-cover rounded-[20px]"
                />
              </motion.div>
            </SwiperSlide>
          ))}

        </Swiper>
      </div>

    </motion.div>
    </div>
  )
}
