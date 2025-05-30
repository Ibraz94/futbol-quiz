"use client"

import Photo from '@/components/Photo';
import { Button } from '@/components/ui/button';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

export default function Experience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className='relative bg-gradient-to-b from-gray-900 to-black' style={{ backgroundImage: `url(/Rectangle.png)`, minHeight: '400px md:min-h-[500px] xl:min-h-[600px]' }}>
      
      {/* Left rectangle image - hidden on mobile, shown on larger screens */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='hidden lg:block absolute top-0 left-0 z-0'>
          <Image 
            src="/rectangle-left.png" 
            alt="games-bg" 
            width={558} 
            height={600}
            className="w-auto h-full max-h-[400px] md:max-h-[500px] xl:max-h-[600px]"
          />
        </div>
      </div>

      {/* Main content container */}
      <motion.div 
        initial={{ opacity: 0, x: -200 }}
        animate={isInView ? {
          opacity: 1,
          x: 0,
          transition: { delay: 2, duration: 0.4, ease: "easeOut" }
        } : {
          opacity: 0,
          x: -200
        }}
        className='relative z-10 container mx-auto flex flex-col justify-center items-start py-8 md:py-12 xl:py-16 px-4 xl:px-0 min-h-[400px] md:min-h-[500px] xl:min-h-[600px] overflow-hidden'>

        <div className='flex flex-col space-y-2 md:space-y-1 xl:space-y-6 overflow-hidden'>
          <h1 className='text-start text-2xl md:text-3xl lg:text-4xl xl:text-[50px] font-bold leading-tight'>Experience the Quiz</h1>
          <h1 className='text-start text-2xl md:text-3xl lg:text-4xl xl:text-[50px] font-bold leading-tight'>Football Games</h1>
        </div>

        <p className='text-start text-sm md:text-base font-light mt-4 md:mt-6 max-w-full lg:max-w-2xl'>
          With Fanatic Flex, every moment is an opportunity to experience the thrill of
          the game. From heart-stopping last-minute goals to game-changing plays,
          our platform lets you dive into the action like never before.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 mt-6 md:mt-8 z-20 relative overflow-hidden w-full sm:w-auto'>
          <Button variant="outline" className="w-full sm:w-auto">
            GET IN TOUCH
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            EXPLORE NOW
          </Button>
        </div>

        <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 mt-8 md:mt-12 xl:mt-16 mb-4 z-20 relative overflow-hidden'>
          <Image 
            src="/app-store.svg" 
            alt="app store" 
            width={211.5} 
            height={100} 
            className="cursor-pointer hover:opacity-80 transition-opacity w-32 h-auto sm:w-40 md:w-48 lg:w-52"
          />
          <Image 
            src="/play-store.svg" 
            alt="play store" 
            width={211.5} 
            height={100} 
            className="cursor-pointer hover:opacity-80 transition-opacity w-32 h-auto sm:w-40 md:w-48 lg:w-52"
          />
        </div>
      </motion.div>

      {/* Photo component positioned properly - only show on larger screens */}
      <div className='lg:block absolute inset-0 pointer-events-none'>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? {
            opacity: 1,
            x: 0,
            transition: { delay: 2, duration: 0.4, ease: "easeOut" }
          } : {
            opacity: 0,
          }}
        >
          <Photo/>
        </motion.div>
      </div>
    </section>
  )
}
