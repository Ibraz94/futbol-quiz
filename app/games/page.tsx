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
          
    </motion.div>
    </div>
  )
}
