import { HttpStatus, Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.schema';
import { UsersService } from 'src/users/users.service';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import {
  CreateUserInput,
  CreateUserOutput,
} from 'src/users/dtos/create-user.dto';
import { LoginInput } from './dtos/login.dto';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { request } from 'express';
import { RemoveUserInput, RemoveUserOutput } from './dtos/removeUser.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    @InjectModel(User)
    private readonly user: ReturnModelType<typeof User>,
  ) {}

  private async validate(userData: User): Promise<User> {
    const validatedUser = await this.usersService.findByEmail(userData);
    if (validatedUser) {
      return validatedUser;
    }
  }

  // 로그인 된 유저정보 가져오기
  // https://stackoverflow.com/questions/47240564/node-js-jwt-get-current-user/47240613
  public async getLoggedUser(accessToken) {
    try{
      const decodedUser = jwt.decode(accessToken)
      
      return decodedUser
      
    }
    catch(error){
      console.log(error)
    }
    
  }

  public async login({ email, password }: LoginInput): Promise<any | { status: number }> {
    const user = await this.user.findOne({ email }); // 이메일로 유저 찾기

    // 패스워드 체크
    if(user.password !== password){
      // 패스워드 틀렸을 시
      return {
        ok: false,
        error: `Invalid password. (${HttpStatus.BAD_REQUEST})`,
      
      };
    }else{
      // 패스워드 정확할 때
      return this.validate(user).then(userData => {
        // 매칭되는 유저정보가 없을 때
        if (!userData) {
          return {
            ok: false,
            error: `Invalid email. (${HttpStatus.BAD_REQUEST})`,
          };
        }
        // const payload = { id: userData.id, nickname: userData.nickname };
        const payload = { nickname: userData.nickname, email:userData.email, id:userData.id };
  
        const accessToken = jwt.sign(payload, this.config.get('SECRET'), {
          expiresIn: this.config.get('EXPIRE'),
        });
        
        this.getLoggedUser(accessToken)
        return {
          ok: true,
          token: accessToken,
        };
      });
    }

    
  }

  // 제대로 작성 필요
  public async register(
    createUserInput: CreateUserInput,
  ): Promise<CreateUserOutput> {
    return await this.usersService.createUser(createUserInput);
  }

  public async removeUser(
    {token}: RemoveUserInput
  ): Promise<RemoveUserOutput> {
    try{
      const loggedUser = await this.getLoggedUser(token);
      console.log(loggedUser)
      if(loggedUser && typeof loggedUser !== 'string'){
        await this.user.findOneAndRemove({email:loggedUser.email})
        return {
          ok: true
        }
      }
      else{
        return {
          ok: false,
          error: "No user to delete."
        }
      }
    }
    catch(error){
      return {
        ok: false,
        error
      }
    }
  }
}
