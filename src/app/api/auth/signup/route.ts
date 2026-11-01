import z from 'zod';

export async function POST(request: Request) {
  // const data = await request.json();
  // return Response.json(data);

  try {
    const schema = z.object({
      name: z.string(),
      password: z.string(),
      email: z.email(),
      guestSessionId: z.string().optional(),
    });

    const body = await request.json();

    const { data, success } = schema.safeParse(body);

    if (!success)
      return Response.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid credentials.',
        },
        {
          status: 400,
        },
      );

    // return res.status(400).json({
    //   statusCode: 400,
    //   error: 'Bad Request',
    //   message: 'Invalid credentials.',
    // });

    const exist = await User.exists({ email: data.email });

    if (exist)
      return res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'Account already exists.',
      });

    const hashedPassword = await argon2.hash(data.password);

    const createdUser = await User.create({
      name: data.name,
      hash: hashedPassword,
      email: data.email,
    });

    req.session.userId = createdUser._id;

    // Check if user has unsaved conversation
    if (data.guestSessionId) {
      const conversation = await Conversation.findOne({
        guestSessionId: data.guestSessionId,
      }).exec();

      if (conversation) {
        conversation.user = createdUser._id;
        conversation.guestSessionId = undefined;
        await conversation.save();
      }
    }

    return res.status(201).send();
  } catch (error) {
    console.error(`[${req.url}] error:`, error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong.',
    });
  }
}
