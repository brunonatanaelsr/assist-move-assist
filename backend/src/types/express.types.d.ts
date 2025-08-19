declare module 'express' {
  import { Application, Router as ExpressRouter } from 'express-serve-static-core';
  
  export interface Express extends Application {}
  export interface Router extends ExpressRouter {}
  export interface Request {}
  export interface Response {}
  export interface NextFunction {}
  
  export default Express;
}
