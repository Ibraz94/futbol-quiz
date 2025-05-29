"use client"

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import "swiper/css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
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
    <div>
    <motion.div initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
      }} className='py-12'>
        <div className='container mx-auto flex flex-col justify-center items-center xl:px-0'>
      <div className='flex items-center justify-between w-full'>
        <div className='flex flex-col mb-12 xl:w-max xl:justify-none space-y-[-12px]'>
          <h1 className='text-base uppercase text-accent'>Latest Games</h1>
          <h1 className='text-[50px] font-semibold'>Featured Games</h1>
        </div>
        
        <div className="flex flex-row gap-6 mb-12">
          <button
            className="border hover:bg-accent-hover hover:border-none text-white w-[37px] h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handlePrevSlide}>
            <ArrowLeft className="w-4" strokeWidth={1.5} />
          </button>
          <button
            className="border hover:bg-accent-hover hover:border-none text-white w-[37px] h-[37px] flex justify-center items-center rounded-full transition-all"
            onClick={handleNextSlide}>
            <ArrowRight className="w-4" strokeWidth={1.5} />
          </button>
        </div>

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
              <div className='w-[380px] h-[410px] rounded-[20px] flex justify-center items-center bg-pink-50/20 overflow-hidden'>
                <Image 
                  src={game.image} 
                  alt="game" 
                  width={400} 
                  height={400} 
                  className="w-full h-full object-cover rounded-[20px]"
                />
              </div>
            </SwiperSlide>
          ))}

        </Swiper>
      </div>

    </motion.div>
    </div>
  )
}
