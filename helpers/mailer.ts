//this is a helper file, used to send the email to the user 

import nodemailer from 'nodemailer';
import User from '@/backend/models/usersModel';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { SentMessageInfo } from 'nodemailer';

//email for sending the email to the user
//emailType to identify whether it is a verify or password reset email
//user id for generating token

//defining the type of the params ....usual ts shit
type SendEmailParams = {
    email: string
    emailType: string
    userId: string
}
export const sendEmail = async ({ email, emailType, userId }: SendEmailParams) => {
    try {
        const hashedToken = crypto.randomBytes(32).toString("hex");
        if (emailType === "VERIFY_USER") {
            //if the email is for user verification then we will update the tokens responsible for user 
            // verification which we created in the schema
            await User.findByIdAndUpdate(userId, {
                isVerifyToken: hashedToken,
                isVerifyTokenExpire: Date.now() + 360000
            })
        }
        else if (emailType === "RESET_PASSWORD") {
            //same for reset password also
            await User.findByIdAndUpdate(userId, {
                forgotPasswordToken: hashedToken,
                forgotPasswordTokenExpire: Date.now() + 360000
            });
        }

        var transport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_MAIL,
                pass: process.env.GMAIL_APP_PASSWORD
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });

        // structuring the mail body
        let mailStructure;
        const currentYear = new Date().getFullYear();
        const baseStyles = "font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f4f7fa; padding: 40px 20px; color: #1e293b; line-height: 1.6;";
        const cardStyles = "max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);";
        const headerStyles = "background-color: #4f46e5; padding: 32px 20px; text-align: center;";
        const contentStyles = "padding: 40px 32px;";
        const buttonStyles = "display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;";
        const footerStyles = "background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;";

        if (emailType === "VERIFY_USER") {
            const verifyLink = `${process.env.DOMAIN}/auth/verifyEmail?token=${hashedToken}`;
            mailStructure = {
                from: `"Ideora" <${process.env.GMAIL_MAIL}>`,
                to: email,
                subject: "Verify your Ideora account",
                html: `
                <div style="${baseStyles}">
                    <div style="${cardStyles}">
                        <div style="${headerStyles}"><h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Ideora</h1></div>
                        <div style="${contentStyles}">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Verify your email</h2>
                            <p style="color: #475569; margin-bottom: 32px;">Welcome to Ideora! Please confirm your email address to get started with your online meetings.</p>
                            <div style="text-align: center;"><a href="${verifyLink}" style="${buttonStyles}">Verify Email Address</a></div>
                            <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 14px;">
                                This link will expire in 1 hour. If you didn't create an account, you can safely ignore this email.
                            </p>
                        </div>
                        <div style="${footerStyles}"><p style="margin: 0; color: #64748b; font-size: 12px;">&copy; ${currentYear} Ideora. All rights reserved.</p></div>
                    </div>
                </div>`
            }
        }
        else if (emailType === "RESET_PASSWORD") {
            const resetLink = `${process.env.DOMAIN}/auth/resetPassword?token=${hashedToken}`;
            mailStructure = {
                from: `"Ideora Support" <${process.env.GMAIL_MAIL}>`,
                to: email,
                subject: "Reset your Ideora password",
                html: `
                <div style="${baseStyles}">
                    <div style="${cardStyles}">
                        <div style="${headerStyles}"><h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Ideora</h1></div>
                        <div style="${contentStyles}">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Reset Password Request</h2>
                            <p style="color: #475569; margin-bottom: 32px;">We received a request to reset your Ideora password. Click the button below to choose a new one.</p>
                            <div style="text-align: center;"><a href="${resetLink}" style="${buttonStyles}">Reset Password</a></div>
                            <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 14px;">
                                This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                            </p>
                        </div>
                        <div style="${footerStyles}"><p style="margin: 0; color: #64748b; font-size: 12px;">&copy; ${currentYear} Ideora. All rights reserved.</p></div>
                    </div>
                </div>`
            }
        } else {
            throw new Error("Invalid email type");
        }

        //sending the mail
        const mailResponse = await transport.sendMail(mailStructure);
        return mailResponse;
    }
    catch (error: any) {
        throw new Error(error.message);
    }
}