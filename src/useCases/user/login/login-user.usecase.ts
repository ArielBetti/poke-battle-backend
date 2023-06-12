import { AppError, Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { ILoginUserDTO, ILoginUserResponseDTO } from "./login-user.dto";
import { UserRepository } from "@repositories/user/user.repository";

import { comparePasswords } from "@providers/encrypt/bcrypt/compare-passwords.provider";
import { JWTProvider } from "@providers/encrypt/jwt/jwt.provider";
import * as z from "zod";

@provide(LoginUserUsecase)
class LoginUserUsecase {
  constructor(
    private userRepository: UserRepository,
    private jwtProvider: JWTProvider,
  ) {}

  async execute(data: ILoginUserDTO): Promise<ILoginUserResponseDTO | null> {
    const loginSchema = z.object({
      email: z
        .string()
        .nonempty({ message: "Email is required" })
        .email({ message: "Email format is invalid" }),
      password: z.string().nonempty({ message: "Password is required" }),
    });

    const { email, password } = data;

    try {
      await loginSchema.parseAsync({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        Report.Error(
          new AppError(
            StatusCode.BadRequest,
            error.issues
              .map((validation) => validation.message)
              .toString()
              .replace(/,/g, ", "),
            "login-user-usecase",
          ),
        );
      }
      throw error;
    }

    const findUser = await this.userRepository.findByEmail(email);

    if (!findUser) {
      Report.Error(
        new AppError(
          StatusCode.Unauthorized,
          "User not a found",
          "login-user-usecase",
        ),
      );

      return null;
    }

    const validPassword = await comparePasswords(password, findUser.password);

    if (!validPassword) {
      Report.Error(
        new AppError(
          StatusCode.Unauthorized,
          "Email or password are is incorrect",
          "login-user-usecase",
        ),
      );

      return null;
    }

    const token = this.jwtProvider.generateToken({
      email: findUser.email,
      name: findUser.name,
      id: findUser.id,
    });

    const response: ILoginUserResponseDTO = {
      token,
      name: findUser.name,
      email: findUser.email,
      status: "success",
      id: findUser.id,
      avatar: findUser.avatar,
    };

    return response;
  }
}

export { LoginUserUsecase };
