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
    <section ref={ref} className='relative bg-gradient-to-b from-gray-900 to-black ' style={{ backgroundImage: `url(/Rectangle.png)`, minHeight: '600px' }}>
      
      {/* Left rectangle image - using relative positioning within a container */}
      <div className='absolute inset-0 pointer-events-none'>
        <div 
          className='absolute top-0 left-0 z-0'>
          <Image src="/rectangle-left.png" alt="games-bg" width={558} height={600} />
        </div>
      </div>

      {/* Main content container */}
      <motion.div 
        initial={{ opacity: 0, x: -200 }}
        animate={isInView ? {
          opacity: 1,
          x: 0,
          transition: { delay: 2, duration: 0.6, ease: "easeOut" }
        } : {
          opacity: 0,
          x: -200
        }}
        className='relative z-10 container mx-auto flex flex-col justify-center items-start py-16 xl:px-0 min-h-[600px] overflow-hidden'>

        <div className='flex flex-col -space-y-12 overflow-hidden'>
          <h1 className='text-start text-[50px] font-bold'>Experience the Quiz</h1>
          <h1 className='text-start text-[50px] font-bold'>Football Games</h1>
        </div>

        <p className='text-start text-base font-light mt-6'>
          With Fanatic Flex, every moment is an opportunity to experience the thrill of<br /> 
          the game. From heart-stopping last-minute goals to game-changing plays,<br /> 
          our platform lets you dive into the action like never before.
        </p>

        <div className='flex gap-6 mt-8 z-20 relative overflow-hidden'>
          <Button variant="outline" >
            GET IN TOUCH
          </Button>
          <Button variant="outline">
            EXPLORE NOW
          </Button>
        </div>

        <div className='flex gap-6 mt-16 z-20 relative overflow-hidden'>
          <Image src="/app-store.svg" alt="app store" width={211.5} height={100} className="cursor-pointer hover:opacity-80 transition-opacity" />
          <Image src="/play-store.svg" alt="play store" width={211.5} height={100} className="cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
      </motion.div>

      {/* Photo component positioned properly */}
      <div className='absolute inset-0 pointer-events-none'>
        <motion.div
          initial={{ opacity: 0, x: 200 }}
          animate={isInView ? {
            opacity: 1,
            x: 0,
            transition: { delay: 2, duration: 0.6, ease: "easeOut" }
          } : {
            opacity: 0,
            x: 200
          }}
        >
          <Photo/>
        </motion.div>
      </div>
    </section>
  )
}
