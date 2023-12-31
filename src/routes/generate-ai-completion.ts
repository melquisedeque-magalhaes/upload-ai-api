import { FastifyInstance } from "fastify";
import { z } from 'zod'
import { OpenAIStream, streamToResponse } from 'ai'
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

export async function generateAiCompletionRoute(app: FastifyInstance) {
    app.post('/ai/complete', async (request, reply) => {
        const bodySchema = z.object({
            videoId: z.string().uuid(),
            prompt: z.string(),
            temperature: z.number().max(1).min(0).default(0.5)
        })

        const { temperature, prompt, videoId } = bodySchema.parse(request.body)

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId
            }
        })

        if(!video.transcription){
            return reply.status(400).send({ error: 'Video transcription was not generated yet' })
        }

        const promptMessage =  prompt.replace('{transcription}', video.transcription)

        const response = await openai.chat.completions.create({
            messages: [{ role: 'user', content: promptMessage }],
            model: 'gpt-3.5-turbo',
            temperature,
            stream: true
        })

        const stream = OpenAIStream(response)

        streamToResponse(stream, reply.raw, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTION'
            }
        })
    })
}