import React from 'react'
import Home from './home'
import ArrowLeft from './arrowLeft'
import Call from './call'
import Camera from './camera'
import Comment from './comment'
import Delete from './delete'
import Edit from './edit'
import Heart from './heart'
import Image from './image'
import Location from './location'
import Lock from './lock'
import Logout from './logout'
import Mail from './mail'
import Plus from './plus'
import Search from './search'
import Send from './send'
import Share from './share'
import ThreeDotsCircle from './threeDotsCircle'
import ThreeDotsHorizontal from './threeDotsHorizontal'
import User from './user'
import Video from './video'
import { theme } from '../../constants/theme'
import { StyleSheet } from 'react-native'

const icons: { [key: string]: any } = {
  home: Home,
  arrowLeft: ArrowLeft,
  call: Call,
  camera: Camera,
  comment: Comment,
  delete: Delete,
  edit: Edit,
  heart: Heart,
  image: Image,
  location: Location,
  lock: Lock,
  logout: Logout,
  mail: Mail,
  plus: Plus,
  search: Search,
  send: Send,
  share: Share,
  threeDotsCircle: ThreeDotsCircle,
  threeDotsHorizontal: ThreeDotsHorizontal,
  user: User,
  video: Video,
}

const Icon = ({ name, ...props }: any) => {
  const IconComponent = icons[name];
  return (
    <IconComponent
      height={props.size || 24}
      width={props.size || 24}
      strokeWidth={props.strokeWidth || 1.9}
      color={theme.colors.textLight}
      {...props}
    />
  )
}

export default Icon


const styles = StyleSheet.create({})
