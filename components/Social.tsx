import Link from "next/link";
import { FaGithub, FaLinkedin, FaYoutube, FaTwitter } from "react-icons/fa";


const socialLinks = [
    {icon: <FaGithub/>, path: ""},
    {icon: <FaLinkedin/>, path: ""},
    {icon: <FaYoutube/>, path: ""},
    {icon: <FaTwitter/>, path: ""},
];

interface SocialProps {
  containerStyles: string;
  iconStyles: string;
}


const social: React.FC<SocialProps> = ({ containerStyles, iconStyles,}) => {
  return (
    <div className={containerStyles}>
      {socialLinks.map((item, index) => (
        <Link key={index} href={item.path} className={iconStyles}>
          {item.icon}
        </Link>
      ))}
    </div>
  );
};

export default social;
