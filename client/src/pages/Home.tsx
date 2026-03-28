/*
  Home page redirects to Overview.
  This file exists for compatibility but the Overview component handles the "/" route.
*/
import { Redirect } from "wouter";

export default function Home() {
  return <Redirect to="/" />;
}
