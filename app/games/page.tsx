"use client"

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import "swiper/css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import Image from 'next/image';
import SliderButtons from '@/components/SliderButtons';



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

  const handleSlideChange = (swiper: any) => {
    const currentIndex = swiper.activeIndex;
    setProject(featuredGames[currentIndex])
  }
  return (
    <div className='bg-gradient-to-b from-gray-900 to-black h-screen'>
    <motion.div initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
      }} className='min-h-[80vh] container mx-auto flex flex-col justify-center items-center py-12 xl:px-0 '>
        <div className='w-full xl:w-[90%]'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col mb-12 xl:w-max xl:justify-none space-y-[-12px]'>
          <h1 className='text-base uppercase text-accent'>Latest Games</h1>
          <h1 className='text-[50px] font-semibold'>Featured Games</h1>
        </div>
        <SliderButtons containerStyles="flex flex-row gap-6 mb-12 xl:w-max xl:justify-none"
          btnStyles="border hover:bg-accent-hover hover:border-none text-white w-[37px] h-[37px] flex justify-center items-center rounded-full transition-all"
          iconStyles="w-4"
        />

      </div>
      

      </div>

    </motion.div>
    </div>
  )
}
