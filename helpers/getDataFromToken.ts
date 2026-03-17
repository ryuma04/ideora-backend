//this file is a helper file, which will extract the id from the token

import jwt from 'jsonwebtoken';
import { Request } from 'express';

export function getDataFromToken(request: Request) {
    try {
        const data = request.cookies["token"];
        if (!data)//if token is missing
        {
            throw new Error("Token missing");
        }
        const decodedToken = jwt.verify(data, process.env.JWT_TOKEN!) as jwt.JwtPayload;
        return decodedToken.id;//returning id which was passed in the token
    } catch (error: any) {
        throw new Error(error.message || "Token verification failed");
    }
}

