import { Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";
import { UserRepository } from "@repositories/user/user.repository";
import { User } from "@entities/user.entity";
import { IUserAvatarDTO, IUserDTO } from "@repositories/user/user.dto";
import { JWTProvider } from "@providers/encrypt/jwt/jwt.provider";
import { stringify } from "qs";
import * as z from "zod";

@provide(CreateUserUseCase)
class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private jwtProvider: JWTProvider,
  ) {}

  getAvatarUrl = (avatar: Omit<IUserAvatarDTO, "url">) => {
    const AVATAR_BASE_URL = "https://api.dicebear.com/6.x/adventurer";
    const params = stringify(
      {
        ...avatar,
      },
      {
        encodeValuesOnly: true,
        arrayFormat: "brackets",
      },
    );

    return `${AVATAR_BASE_URL}/svg?seed=${encodeURIComponent(avatar.seed)}${
      params ? `&${params}` : null
    }`;
  };

  async execute(data: ICreateUserDTO): Promise<ICreateUserResponseDTO | null> {
    const createSchema = z.object({
      name: z.string().nonempty({ message: "Name is required" }),
      email: z
        .string()
        .nonempty({ message: "Email is required" })
        .email({ message: "Email format is invalid" }),
      password: z
        .string()
        .nonempty({ message: "Password is required" })
        .min(6, "Password required min 6 characters"),
    });

    try {
      const { name, email, password, avatar } = data;

      await createSchema.parseAsync({
        name,
        email,
        password,
      });

      const findUser = await this.userRepository.findByEmail(email);

      if (findUser) {
        Report.Error(
          "User already exists",
          StatusCode.BadRequest,
          "create-user-usecase",
        );
      }

      const avatarObject = { ...avatar, url: this.getAvatarUrl(avatar) };

      const user: IUserDTO = await this.userRepository.create(
        new User(name, email, password, avatarObject),
      );

      if (!user) {
        Report.Error(
          "Registry error",
          StatusCode.BadRequest,
          "create-user-usecase",
        );
      }

      let response: ICreateUserResponseDTO;

      if (user !== null) {
        const token = this.jwtProvider.generateToken({
          email: user.email,
          name: user.name,
          id: user.id,
        });

        response = {
          id: `${user.id}`,
          token,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          status: "success",
        };
        return response;
      }

      return null;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        Report.Error(
          error.issues
            .map((validation) => validation.message)
            .toString()
            .replace(/,/g, ", "),
          StatusCode.BadRequest,
          "create-user-usecase",
        );
      }
      throw error;
    }
  }
}

export { CreateUserUseCase };
