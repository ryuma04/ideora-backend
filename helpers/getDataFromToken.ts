//this file is a helper file, which will extract the id from the token

import jwt from 'jsonwebtoken';
import { Request } from 'express';

export function getDataFromToken(request: Request) {
    try {
        console.log("getDataFromToken: All Cookies:", JSON.stringify(request.cookies));
        const data = request.cookies["token"];
        if (!data)//if token is missing
        {
            console.log("getDataFromToken: Token cookie is missing from request");
            throw new Error("Token missing");
        }
        
        try {
            const decodedToken = jwt.verify(data, process.env.JWT_TOKEN!) as jwt.JwtPayload;
            return decodedToken.id;//returning id which was passed in the token
        } catch (verifyError: any) {
            console.error("getDataFromToken: Token verification failed", verifyError.message);
            throw new Error("Token verification failed: " + verifyError.message);
        }
    } catch (error: any) {
        throw new Error(error.message || "Token verification failed");
    }
}

