import { Component, Input, input, output  } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TodoI } from '../todo-interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-todo-detail',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './todo-detail.html',
  styleUrl: './todo-detail.scss'
})
export class TodoDetail {
  @Input({ required: true}) form!: FormGroup;
  selectedTodo = input.required<TodoI | null>();
  submitFormData = output<TodoI>();
  clearFormData = output();

  submitForm() {
    this.submitFormData.emit(this.form.value)
  }

  resetForm() {
    this.clearFormData.emit()
  }
}
