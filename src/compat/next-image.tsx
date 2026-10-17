import React from 'react';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  unoptimized?: boolean;
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
  { priority: _priority, fill, sizes: _sizes, unoptimized: _unoptimized, style, ...rest },
  ref
) {
  const fillStyle: React.CSSProperties = fill
    ? {
        position: 'absolute',
        height: '100%',
        width: '100%',
        inset: 0,
        objectFit: 'cover',
        ...style,
      }
    : (style || {});

  return <img ref={ref} style={fillStyle} {...rest} />;
});

export default Image;
