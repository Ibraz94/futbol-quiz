"use client";

import { useSwiper } from "swiper/react";  
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface SliderButtonsProps {
    containerStyles: string;
    btnStyles: string;
    iconStyles: string;
}

const SliderButtons = ({ containerStyles, btnStyles, iconStyles }: SliderButtonsProps) => {
    const swiper = useSwiper();
    return (
        <div className={containerStyles}>
            <button className={btnStyles} onClick={()=> swiper.slidePrev()}>
            <ArrowLeft className={iconStyles} strokeWidth={1.5}/>
            </button>
            <button className={btnStyles} onClick={()=> swiper.slideNext()}>
            <ArrowRight className={iconStyles} strokeWidth={1.5}/>
            </button>
        </div>


)
}

export default SliderButtons;
