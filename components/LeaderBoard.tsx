"use client"

import { useState } from 'react';
import Image from 'next/image';


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

  const [isLeaderboard, setIsLeaderboard] = useState(leaderboard[0]);

  const handleSlideChange = (swiper: any) => {
    const currentIndex = swiper.activeIndex;
    setIsLeaderboard(leaderboard[currentIndex])
  }
  return (
    <section className=" flex flex-col items-center justify-center py-12 xl:py-2">
      <h2 className="text-center text-base font-normal text-accent uppercase">leaderboard</h2>
      <h1 className="text-center text-[50px] font-semibold">Quiz Games Leaderboard</h1>
      <p className="text-center font-light text-base">Check out our top players who have mastered the casino-style games and claimed their spot at the top!<br /> Compete with others to see if you can climb the ranks and become the ultimate champion.</p>
      <div className="w-[1290px] bg-[#2F265380] rounded-[20px] mt-[50px] border border-white/10">
        <div className='bg-[#3707FC] sticky top-0 rounded-t-[20px] z-10'>
          <tr className='text-2xl font-light uppercase flex items-center justify-between px-16 py-6'>
            <th className="flex-1 text-left">username</th>
            <th className="flex-1 text-center">Games</th>
            <th className="flex-1 text-center">Now Playing</th>
          </tr>
        </div>
        <div className="max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple scrollbar-track-dark pr-2">
          {leaderboard.map((item, index) => (
            <div key={index} className='px-8 py-2'>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Leaderboards